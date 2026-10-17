import { Chess, type Color, type Square } from 'chess.js';
export const pieceNames: Record<string,string>={p:'兵',n:'马',b:'象',r:'车',q:'后',k:'王'};
export function moveUci(game:Chess,uci:string){return game.move({from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4]});}
export function gameFromPgn(pgn:string){const c=new Chess();if(pgn)c.loadPgn(pgn);return c;}
export function resultText(game:Chess){
 if(game.isCheckmate())return `${game.turn()==='w'?'黑方':'白方'}获胜 · 将死`;
 if(game.isStalemate())return '平局 · 逼和';
 if(game.isThreefoldRepetition())return '平局 · 三次重复局面';
 if(game.isInsufficientMaterial())return '平局 · 子力不足';
 if(game.isDrawByFiftyMoves())return '平局 · 五十回合规则';
 if(game.isDraw())return '平局';
 return `${game.turn()==='w'?'白方':'黑方'}走棋${game.isCheck()?' · 正在被将军':''}`;
}
export function describeMove(fen:string,uci:string){
 const c=new Chess(fen);try{const m=moveUci(c,uci);return `${m.from} → ${m.to}：${pieceNames[m.piece]}${m.captured?'吃'+pieceNames[m.captured]:'移动'}${m.promotion?'，升为'+pieceNames[m.promotion]:''}${c.isCheckmate()?'，将死':c.isCheck()?'，将军':''}。`;}catch{return '请观察棋盘上的建议走法。';}
}
export function legalDests(game:Chess){const dests=new Map<Square,Square[]>();for(const m of game.moves({verbose:true})){const d=dests.get(m.from)||[];if(!d.includes(m.to))d.push(m.to);dests.set(m.from,d);}return dests;}
export type EngineResult={best:string;depth:number;cp?:number;mate?:number;pv:string[]};
export function whiteScore(result:EngineResult,turn:Color){return result.cp===undefined?undefined:result.cp*(turn==='w'?1:-1);}
export function isBlunder(before:EngineResult,after:EngineResult,side:Color,beforeTurn:Color,afterTurn:Color){
 if(before.depth<10||after.depth<10)return false;
 const ownMate=(r:EngineResult,t:Color)=>r.mate===undefined?undefined:r.mate*(t===side?1:-1);
 const bm=ownMate(before,beforeTurn),am=ownMate(after,afterTurn);
 if(am!==undefined&&am<0&&(bm===undefined||bm>0))return true;
 const b=whiteScore(before,beforeTurn),a=whiteScore(after,afterTurn);
 return b!==undefined&&a!==undefined&&(b-a)*(side==='w'?1:-1)>=200;
}

export function opponentMateInOne(fen:string,side:Color){
 const c=new Chess(fen);if(c.turn()===side)return undefined;
 for(const m of c.moves({verbose:true})){c.move(m);const mate=c.isCheckmate();c.undo();if(mate)return m.from+m.to+(m.promotion||'');}
 return undefined;
}
