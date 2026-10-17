import {describe,it,expect} from 'vitest';
import {Chess} from 'chess.js';
import {moveUci,resultText,isBlunder,type EngineResult} from '../src/lib/chess';
const analysis=(cp:number,depth=12):EngineResult=>({best:'e2e4',depth,cp,pv:[]});
describe('棋规与教练判定',()=>{
 it('合法双侧易位与被攻击路径限制',()=>{
  const c=new Chess('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');expect(c.moves()).toContain('O-O');expect(c.moves()).toContain('O-O-O');moveUci(c,'e1g1');expect(c.get('f1')?.type).toBe('r');
  const attacked=new Chess('k4r2/8/8/8/8/8/8/4K2R w K - 0 1');expect(attacked.moves()).not.toContain('O-O');
 });
 it('吃过路兵仅在紧接一步有效',()=>{
  const c=new Chess('7k/8/8/3pP3/8/8/8/7K w - d6 0 1');moveUci(c,'e5d6');expect(c.get('d5')).toBeUndefined();
  const expired=new Chess('7k/8/8/3pP3/8/8/8/7K w - d6 0 1');moveUci(expired,'h1g1');moveUci(expired,'h8g8');expect(expired.moves()).not.toContain('exd6');
 });
 it('四种升变都可执行',()=>{for(const p of ['q','r','b','n']){const c=new Chess('7k/P7/8/8/8/8/8/7K w - - 0 1');moveUci(c,'a7a8'+p);expect(c.get('a8')?.type).toBe(p);}});
 it('被将军时拒绝无关走法，区分将死与逼和',()=>{
  const c=new Chess('k3r3/8/8/8/8/8/P7/4K3 w - - 0 1');expect(c.moves()).not.toContain('a3');
  const mate=new Chess('7k/6Q1/5K2/8/8/8/8/8 b - - 0 1');expect(resultText(mate)).toContain('将死');
  const stale=new Chess('7k/5K2/6Q1/8/8/8/8/8 b - - 0 1');expect(resultText(stale)).toContain('逼和');
 });
 it('重复、五十回合、子力不足和棋',()=>{
  const c=new Chess();for(let i=0;i<2;i++)for(const m of ['g1f3','g8f6','f3g1','f6g8'])moveUci(c,m);expect(resultText(c)).toContain('三次重复');
  expect(resultText(new Chess('7k/8/8/8/8/8/R7/7K w - - 100 51'))).toContain('五十');
  expect(resultText(new Chess('7k/8/8/8/8/8/8/7K w - - 0 1'))).toContain('子力不足');
 });
 it('统一评价方向，不把黑方优势当白方优势，浅分析不判断',()=>{
  expect(isBlunder(analysis(100),analysis(150),'w','w','b')).toBe(true);
  expect(isBlunder(analysis(100),analysis(150),'b','b','w')).toBe(true);
  expect(isBlunder(analysis(100),analysis(-150),'w','w','b')).toBe(false);
  expect(isBlunder(analysis(100,6),analysis(300),'w','w','b')).toBe(false);
  expect(isBlunder(analysis(0),{best:'',depth:12,mate:3,pv:[]},'w','w','b')).toBe(true);
 });
});
it('一步将死威胁通过合法走法验证，不依赖引擎深度',async()=>{
 const {opponentMateInOne}=await import('../src/lib/chess');const c=new Chess();for(const m of ['f2f3','e7e5','g2g4'])moveUci(c,m);
 expect(opponentMateInOne(c.fen(),'w')).toBe('d8h4');expect(opponentMateInOne(c.fen(),'b')).toBeUndefined();expect(opponentMateInOne(new Chess().fen(),'b')).toBeUndefined();
});
