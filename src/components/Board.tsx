import {useLayoutEffect,useRef,useState,type CSSProperties} from 'react';
import {Chess, type Square} from 'chess.js';
import {Chessground} from '@lichess-org/chessground';
import type {Api} from '@lichess-org/chessground/api';
import type {Key} from '@lichess-org/chessground/types';
import {legalDests} from '../lib/chess';
import '@lichess-org/chessground/assets/chessground.base.css';
import '@lichess-org/chessground/assets/chessground.brown.css';
export function Board({fen,orientation='w',disabled=false,showDests=true,arrow,lastMove,demonstration,demonstrationKey=0,onMove}:{fen:string;orientation?:'w'|'b';disabled?:boolean;showDests?:boolean;arrow?:string;lastMove?:string;demonstration?:string;demonstrationKey?:number;onMove?:(uci:string)=>void}){
 const frame=useRef<HTMLDivElement>(null),host=useRef<HTMLDivElement>(null),api=useRef<Api|null>(null),callback=useRef(onMove);
 const [promotion,setPromotion]=useState<{from:string;to:string}|null>(null);
 callback.current=onMove;
 useLayoutEffect(()=>{if(!host.current)return;api.current=Chessground(host.current,{addDimensionsCssVarsTo:frame.current!,fen,orientation:orientation==='w'?'white':'black',animation:{enabled:true,duration:180},coordinates:false,disableContextMenu:true,premovable:{enabled:false},drawable:{enabled:false}});const element=host.current;const refreshBounds=()=>api.current?.state.dom.bounds.clear();element.addEventListener('mousedown',refreshBounds,true);element.addEventListener('touchstart',refreshBounds,{capture:true,passive:true});return ()=>{element.removeEventListener('mousedown',refreshBounds,true);element.removeEventListener('touchstart',refreshBounds,true);api.current?.destroy();api.current=null;};},[]);
 useLayoutEffect(()=>{
  const game=new Chess(fen),color=game.turn()==='w'?'white':'black';
  setPromotion(null);
  api.current?.set({fen,orientation:orientation==='w'?'white':'black',turnColor:color,check:game.isCheck(),lastMove:lastMove?[lastMove.slice(0,2) as Key,lastMove.slice(2,4) as Key]:[],selected:undefined,
   movable:{free:false,color:disabled?undefined:color,dests:disabled?new Map():legalDests(game),showDests,rookCastle:false,events:{after:(from,to)=>{
    api.current?.set({fen,turnColor:color,movable:{dests:legalDests(game)}});
    if(game.get(from as Square)?.type==='p'&&(to[1]==='8'||to[1]==='1'))setPromotion({from,to});else callback.current?.(from+to);
   }}},
   drawable:{autoShapes:arrow?[{orig:arrow.slice(0,2) as Key,dest:arrow.slice(2,4) as Key,brush:'green'}]:[]}
  });
 },[fen,orientation,disabled,showDests,arrow,lastMove]);
 const files=orientation==='w'?'abcdefgh':'hgfedcba',ranks=orientation==='w'?'87654321':'12345678';
 const demoPiece=demonstration?new Chess(fen).get(demonstration.slice(0,2) as Square):undefined;
 const position=(square:string)=>{const x=square.charCodeAt(0)-97,y=8-Number(square[1]);return orientation==='w'?[x,y]:[7-x,7-y];};
 let demoStyle:CSSProperties={};
 if(demonstration&&demoPiece){const [x,y]=position(demonstration.slice(0,2)),[tx,ty]=position(demonstration.slice(2,4));
  const [mx,my]=demoPiece.type==='n'?(Math.abs(tx-x)===2?[tx,y]:[x,ty]):[(x+tx)/2,(y+ty)/2];
  demoStyle={'--from-x':x*100+'%','--from-y':y*100+'%','--mid-x':mx*100+'%','--mid-y':my*100+'%','--to-x':tx*100+'%','--to-y':ty*100+'%'} as CSSProperties;
 }
 return <div className="board-frame" ref={frame}><div className="board-ranks" aria-hidden="true">{[...ranks].map(rank=><span key={rank}>{rank}</span>)}</div><div className="board-files" aria-hidden="true">{[...files].map(file=><span key={file}>{file}</span>)}</div><div className="board-shell"><div className="chessboard" style={{pointerEvents:disabled?'none':undefined}} ref={host} role="group" aria-label="国际象棋棋盘，点击棋子再点击目标格，或拖动棋子" />{demoPiece&&<img key={demonstration+':'+demonstrationKey} className="move-demonstration" style={demoStyle} src={import.meta.env.BASE_URL+'pieces/'+demoPiece.color+demoPiece.type.toUpperCase()+'.svg'} alt="" aria-hidden="true" draggable={false}/>}{promotion&&<div className="promotion-mask"><div role="dialog" aria-modal="true" aria-label="选择升变棋子" className="promotion-dialog"><h3>让兵成为…</h3><p>到达底线，选择新的棋子。</p><div>{[['q','后'],['r','车'],['b','象'],['n','马']].map(([p,n])=><button key={p} onClick={()=>{const m=promotion;setPromotion(null);callback.current?.(m.from+m.to+p);}}>{n}</button>)}</div><button className="text-button" onClick={()=>{setPromotion(null);api.current?.set({fen,movable:{dests:legalDests(new Chess(fen))}});}}>取消</button></div></div>}</div></div>;
}
