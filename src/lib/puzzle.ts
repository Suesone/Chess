import {Chess} from 'chess.js';
import {moveUci,pieceNames,type EngineResult} from './chess';

export type PuzzleStep={uci:string;san:string;text:string};
export type PuzzleSearch=(fen:string,options:{depth:number;ms:number;searchMoves:string[]})=>Promise<EngineResult>;
export type PuzzleVerdict={kind:'correct';continuation?:PuzzleStep[]}|{kind:'incorrect'}|{kind:'uncertain';message:string};
export const VERIFY_DEPTH=16;
const TOLERANCE_CP=50;

export function describePuzzleStep(game:Chess,uci:string):PuzzleStep{
 const m=moveUci(game,uci);
 return {uci,san:m.san,text:`${m.color==='w'?'白方':'黑方'}${pieceNames[m.piece]}从 ${m.from} 到 ${m.to}${m.captured?'，吃掉'+pieceNames[m.captured]:''}${m.promotion?'，升为'+pieceNames[m.promotion]:''}${game.isCheckmate()?'，将死':game.isCheck()?'，将军':''}。`};
}
function continuation(fen:string,move:string,result:EngineResult,plies:number){
 if(result.best!==move||result.pv[0]!==move)return undefined;
 const game=new Chess(fen),steps:PuzzleStep[]=[];
 try{for(const uci of result.pv.slice(0,plies)){steps.push(describePuzzleStep(game,uci));if(game.isGameOver())break;}}
 catch{return undefined;}
 // Do not splice an incomplete or illegal engine line into the exercise.
 if(steps.length<plies&&!game.isGameOver())return undefined;
 return steps;
}

export async function judgePuzzleMove({fen,move,expected,theme,remainingPlies,search}:{fen:string;move:string;expected:string;theme:string;remainingPlies:number;search:PuzzleSearch}):Promise<PuzzleVerdict>{
 const position=new Chess(fen);let step:PuzzleStep;
 try{step=describePuzzleStep(position,move);}catch{return {kind:'incorrect'};}
 if(move===expected)return {kind:'correct'};
 if(position.isCheckmate())return {kind:'correct',continuation:[step]};
 // The objective of mate-in-one is exact and can be checked without an engine.
 if(theme==='mateIn1')return {kind:'incorrect'};
 const uncertain=(message='暂时无法可靠核验这一步，可以重试；此次不记错题。'):PuzzleVerdict=>({kind:'uncertain',message});
 try{
  // Both root searches use the SAME position, side, depth and a forced root move.
  // Evaluating the post-move position would reverse the score's perspective.
  const options={depth:VERIFY_DEPTH,ms:3000};
  const reference=await search(fen,{...options,searchMoves:[expected]});
  const candidate=await search(fen,{...options,searchMoves:[move]});
  if(reference.depth<VERIFY_DEPTH||candidate.depth<VERIFY_DEPTH||reference.best!==expected||candidate.best!==move)return uncertain();
  let equivalent=false;
  if(candidate.mate!==undefined&&candidate.mate>0)equivalent=true;
  else if(reference.mate!==undefined){
   // A finite score cannot prove equivalence with a forced mate. Avoid a false mark.
   if(reference.mate>0)return uncertain('参考解法能强制将死，但目前还不能确认这步是否同样成立；此次不记错题，可以重试。');
   if(candidate.cp!==undefined)equivalent=true;
   else return uncertain();
  }else if(reference.cp!==undefined&&candidate.cp!==undefined){
   equivalent=candidate.cp>=reference.cp-TOLERANCE_CP;
  }else if(candidate.mate!==undefined&&candidate.mate<0&&reference.cp!==undefined){
   return {kind:'incorrect'};
  }else return uncertain();
  if(!equivalent)return {kind:'incorrect'};
  const line=continuation(fen,move,candidate,remainingPlies);
  if(!line)return uncertain('这步可能同样成立，但后续变化尚未核验完整；此次不记错题，可以重试。');
  return {kind:'correct',continuation:line};
 }catch(error){
  if((error as Error).name==='AbortError')throw error;
  return uncertain('核验引擎暂时不可用。此次不记错题，请检查网络或重新核验。');
 }
}
