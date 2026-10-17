import {it,expect,vi} from 'vitest';
import {Chess} from 'chess.js';
import {judgePuzzleMove,describePuzzleStep,type PuzzleSearch} from '../src/lib/puzzle';
import type {EngineResult} from '../src/lib/chess';

const fen='7k/8/8/R2q4/8/8/8/3R3K w - - 0 1';
const pv=['d1d5','h8g8','a5a8','g8h7','d5d7'];
function result(best:string,cp=700,depth=16):EngineResult{return {best,cp,depth,pv:best==='d1d5'?pv:['a5d5','h8g8','d5d8']};}
const input={fen,move:'d1d5',expected:'a5d5',theme:'hangingPiece',remainingPlies:5};
const search=()=>vi.fn<PuzzleSearch>().mockResolvedValueOnce(result('a5d5')).mockResolvedValueOnce(result('d1d5',690));

it('参考走法无需引擎，另一合法走法不会仅因不同而判错',async()=>{
 const engine=search();expect(await judgePuzzleMove({...input,move:'a5d5',search:engine})).toEqual({kind:'correct'});expect(engine).not.toHaveBeenCalled();
 const verdict=await judgePuzzleMove({...input,search:engine});expect(verdict.kind).toBe('correct');
 if(verdict.kind==='correct'){expect(verdict.continuation?.map(s=>s.uci)).toEqual(pv);expect(verdict.continuation?.[0].san).toBe('Rdxd5');}
 expect(engine.mock.calls.map(([position,options])=>[position,options.searchMoves])).toEqual([[fen,['a5d5']],[fen,['d1d5']]]);
});
it('同一个真实一步将死题的两种将死都通过，其他主题的立即将死也通过',async()=>{
 const position='6k1/p1p3pp/4N3/1p6/2q1r1n1/2B5/PP4PP/3R1R1K w - - 0 29';
 for(const theme of ['mateIn1','fork']){
  const engine=search();const v=await judgePuzzleMove({fen:position,move:'d1d8',expected:'f1f8',theme,remainingPlies:1,search:engine});
  expect(v.kind).toBe('correct');expect(engine).not.toHaveBeenCalled();
 }
 const v=await judgePuzzleMove({fen:position,move:'h2h3',expected:'f1f8',theme:'mateIn1',remainingPlies:1,search:search()});expect(v.kind).toBe('incorrect');
});
it('合法但损失战术收益的走法不通过，浅分析或失败不武断判错',async()=>{
 const bad=vi.fn<PuzzleSearch>().mockResolvedValueOnce(result('a5d5')).mockResolvedValueOnce(result('d1d5',100));
 expect((await judgePuzzleMove({...input,search:bad})).kind).toBe('incorrect');
 const shallow=vi.fn<PuzzleSearch>().mockResolvedValueOnce(result('a5d5')).mockResolvedValueOnce(result('d1d5',690,8));
 expect((await judgePuzzleMove({...input,search:shallow})).kind).toBe('uncertain');
 const unavailable=vi.fn<PuzzleSearch>().mockRejectedValue(Error('worker unavailable'));
 expect((await judgePuzzleMove({...input,search:unavailable})).kind).toBe('uncertain');
});
it('黑方使用同一根局面的评分方向，不会错误地反转第二次评分',async()=>{
 const blackFen='3r3k/8/8/r2Q4/8/8/8/7K b - - 0 1';
 const engine=vi.fn<PuzzleSearch>().mockResolvedValueOnce({...result('a5d5'),pv:['a5d5']}).mockResolvedValueOnce({...result('d8d5',680),pv:['d8d5']});
 expect((await judgePuzzleMove({fen:blackFen,move:'d8d5',expected:'a5d5',theme:'hangingPiece',remainingPlies:1,search:engine})).kind).toBe('correct');
});
it('强制将死解法允许不同将死距离，未能证明将死的分支保持待核验',async()=>{
 const mate=vi.fn<PuzzleSearch>().mockResolvedValueOnce({...result('a5d5'),cp:undefined,mate:5}).mockResolvedValueOnce({...result('d1d5'),cp:undefined,mate:7});
 expect((await judgePuzzleMove({...input,search:mate})).kind).toBe('correct');
 const finite=vi.fn<PuzzleSearch>().mockResolvedValueOnce({...result('a5d5'),cp:undefined,mate:5}).mockResolvedValueOnce(result('d1d5',1500));
 expect((await judgePuzzleMove({...input,search:finite})).kind).toBe('uncertain');
});
it('不接入不完整、非法或与用户走法不一致的后续变化',async()=>{
 for(const line of [['d1d5'],['d1d5','h8h1'],['a5d5','h8g8','d5d8']]){
  const engine=vi.fn<PuzzleSearch>().mockResolvedValueOnce(result('a5d5')).mockResolvedValueOnce({...result('d1d5'),pv:line});
  expect((await judgePuzzleMove({...input,search:engine})).kind).toBe('uncertain');
 }
});
it('取消任务保持取消语义，避免切换题目后记录旧结果',async()=>{
 const engine=vi.fn<PuzzleSearch>().mockRejectedValue(new DOMException('cancelled','AbortError'));
 await expect(judgePuzzleMove({...input,search:engine})).rejects.toMatchObject({name:'AbortError'});
});
it('分支解说由实际落子生成，吃子、将军与升变信息一致',()=>{
 const c=new Chess(fen),s=describePuzzleStep(c,'d1d5');expect(s.text).toContain('吃掉后');expect(s.san).toBe('Rdxd5');
});
