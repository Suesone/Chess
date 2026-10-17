import {useEffect,useRef,useState} from 'react';
import {Chess} from 'chess.js';
import {ArrowRight,Download,Flag,Lightbulb,RotateCcw,RefreshCw,Check,ChevronDown} from 'lucide-react';
import {Board} from './Board';
import {Engine,type EngineState} from '../lib/engine';
import {describeMove,gameFromPgn,isBlunder,moveUci,resultText,opponentMateInOne} from '../lib/chess';
import {download,type Progress} from '../lib/storage';
const levels={beginner:{name:'入门',skill:0,ms:150,depth:2,description:'短时间思考，辅助提示默认开启'},casual:{name:'轻松',skill:5,ms:400,depth:6,description:'更认真一些，适合巩固基础'},challenge:{name:'挑战',skill:10,ms:900,depth:12,description:'给自己一点挑战'}};
const statusLabels:Record<EngineState,string>={idle:'按需加载 · 本机计算',loading:'正在加载棋力引擎…',ready:'引擎已就绪',thinking:'正在思考…',error:'引擎加载或运行失败'};
export function Play({progress,updateSettings,saveGame}:{progress:Progress;updateSettings:(s:Partial<Progress['settings']>)=>void;saveGame:(pgn:string)=>void}){
 const game=useRef(gameFromPgn(progress.pgn)),[fen,setFen]=useState(game.current.fen()),[nonce,setNonce]=useState(0),[status,setStatus]=useState<EngineState>('idle'),[busy,setBusy]=useState(false),[warning,setWarning]=useState(false),[hint,setHint]=useState(''),[arrow,setArrow]=useState<string>(),[error,setError]=useState(''),[newGameDialog,setNewGameDialog]=useState(false);
 const engine=useRef<Engine|null>(null);if(!engine.current)engine.current=new Engine(setStatus);
 const pending=useRef<{fen:string;uci:string}|null>(null),generation=useRef(0);
 const {side,level,coach,dests}=progress.settings;
 const complete=game.current.isGameOver(),humanTurn=game.current.turn()===side,last=game.current.history({verbose:true}).at(-1),moves=game.current.history();
 function commit(){setFen(game.current.fen());saveGame(game.current.pgn());setArrow(undefined);}
 function cancel(){generation.current++;engine.current!.cancel();setBusy(false);setWarning(false);setError('');setHint('');setArrow(undefined);}
 useEffect(()=>{
  const gen=++generation.current;let live=true;
  const run=async()=>{
   if(game.current.isGameOver())return;
   if(pending.current&&coach){setBusy(true);const review=pending.current;
    if(opponentMateInOne(fen,side)){pending.current=null;setWarning(true);setHint('对方下一步有直接将死的机会。这一威胁已通过合法走法验证，可以退回一步，重新检查王的安全。');setBusy(false);return;}
    try{const beforeGame=new Chess(review.fen),afterGame=new Chess(fen);
     const before=await engine.current!.search(review.fen,{ms:650}),after=await engine.current!.search(fen,{ms:650});
     if(!live||generation.current!==gen)return;pending.current=null;
     if(isBlunder(before,after,side,beforeGame.turn(),afterGame.turn())){setWarning(true);setHint('这一步之后，局面评价明显下降，或出现了被迫将死的变化。可以退回一步重新观察，也可以继续实战。');setBusy(false);return;}
    }catch(e){if((e as Error).name==='AbortError')return;throw e;}
   }else pending.current=null;
   if(game.current.turn()===side){setBusy(false);return;}
   setBusy(true);const result=await engine.current!.search(fen,levels[level]);
   if(!live||generation.current!==gen)return;
   if(!result.best||result.best==='(none)')throw Error('电脑没有返回可执行的走法，请重试。');
   moveUci(game.current,result.best);setBusy(false);commit();
  };
  run().catch(e=>{if(!live||(e as Error).name==='AbortError')return;setError((e as Error).message||'引擎暂时不可用，请重试。');setBusy(false);});
  return ()=>{live=false;generation.current++;engine.current!.cancel();};
 },[fen,nonce,side,level,coach]);
 function move(uci:string){if(busy||warning||complete||game.current.turn()!==side)return;const previous=game.current.fen();try{moveUci(game.current,uci);pending.current={fen:previous,uci};setHint('');commit();}catch{setError('这步棋不合法，请重新选择。');}}
 function undo(single=false){cancel();pending.current=null;game.current.undo();if(!single&&game.current.turn()!==side)game.current.undo();commit();setNonce(n=>n+1);}
 function restart(newSide=side){cancel();pending.current=null;game.current=new Chess();updateSettings({side:newSide});commit();setNonce(n=>n+1);setNewGameDialog(false);}
 async function ask(){if(busy||warning||complete||!humanTurn)return;setError('');setBusy(true);const gen=generation.current;
  try{const r=await engine.current!.search(fen,{ms:900});if(gen!==generation.current)return;if(!r.best||r.best==='(none)')throw Error('这个局面暂无建议，请重试。');setArrow(r.best);setHint(describeMove(fen,r.best)+(r.depth>=10?'这是引擎当前建议的关键一步。':'分析较浅，建议仅供练习参考。'));}catch(e){if((e as Error).name!=='AbortError')setError((e as Error).message);}finally{if(gen===generation.current)setBusy(false);}
 }
 return <><div className="section-heading"><div><div className="eyebrow">PLAY, NOTICE, LEARN</div><h1>下一盘，学一点</h1><p className="muted">不用赶时间。你的教练就在旁边。</p></div><button className="secondary" onClick={()=>setNewGameDialog(true)}><RefreshCw size={16}/> 新的一盘</button></div><div className="work-area play-area"><div><div className="player-label"><span className="avatar mini dark">{side==='w'?'♟':'♙'}</span><span>电脑 · {levels[level].name}</span><span className="label-right"><span className={'status-dot '+(status==='thinking'?'pulse':'')}/>{statusLabels[status]}</span></div><Board fen={fen} orientation={side} disabled={busy||warning||complete||!humanTurn} showDests={dests} onMove={move} arrow={arrow} lastMove={last?last.from+last.to:undefined}/><div className="player-label bottom"><span className="avatar mini">{side==='w'?'♙':'♟'}</span><span>你 · {side==='w'?'白方':'黑方'}</span><span className="label-right">{resultText(game.current)}</span></div><div className="board-toolbar"><button className="text-button" disabled={!moves.length} onClick={()=>undo(warning)}><RotateCcw size={16}/> 悔棋</button><button className="text-button" disabled={busy||warning||complete||!humanTurn} onClick={ask}><Lightbulb size={16}/> 求助教练</button><button className="text-button" onClick={()=>download('初着-棋谱.pgn',game.current.pgn(),'application/x-chess-pgn')}><Download size={16}/> 导出棋谱</button></div></div><aside><section className="coach-panel panel"><div className="coach-profile"><span className="avatar">♞</span><div><strong>你的随行教练</strong><small>多思考一步，慢慢变强</small></div><span className="online-dot"/></div>{complete?<><h2>{resultText(game.current)}</h2><p>这盘棋已经结束。无论结果如何，试着记住一个你发现的新机会。</p><button className="primary full" onClick={()=>setNewGameDialog(true)}>再下一盘 <ArrowRight size={17}/></button></>:warning?<><span className="coach-tag amber"><Flag size={15}/> 停一下，想一想</span><h2>这里可能有个更好的选择</h2><p aria-live="polite">{hint}</p><button className="primary full" onClick={()=>undo(true)}>退回这一步，重新试试</button><button className="secondary full" onClick={()=>{setWarning(false);setHint('继续这盘棋，留意对方接下来的威胁。');setNonce(n=>n+1);}}>继续实战</button></>:<><span className="coach-tag"><Lightbulb size={15}/> 一点小建议</span><h2>{busy?'让我看看这个局面…':'落子前，看三个地方'}</h2><p className="coach-message" aria-live="polite">{hint||'我有没有被将军？有没有棋子被攻击？对方下一步想做什么？'}</p><button className="secondary full" disabled={busy||!humanTurn} onClick={ask}><Lightbulb size={17}/> 帮我看看下一步</button></>}{error&&<div className="error-box" role="alert"><p>{error}</p><button className="secondary" onClick={()=>{cancel();setNonce(n=>n+1);}}>重新连接引擎</button></div>}<div className="play-settings"><label>电脑难度 <span className="select-wrap"><select value={level} onChange={e=>{cancel();updateSettings({level:e.target.value as typeof level,...(e.target.value==='beginner'?{coach:true,dests:true}:{})});}}>{Object.entries(levels).map(([key,l])=><option key={key} value={key}>{l.name}</option>)}</select><ChevronDown size={14}/></span></label><p className="setting-note">{levels[level].description}，不对应真实等级分。</p><label className="toggle-label">明显失误提醒 <input type="checkbox" checked={coach} onChange={e=>{if(warning){pending.current=null;setWarning(false);setNonce(n=>n+1);}updateSettings({coach:e.target.checked});}}/><span className="switch"/></label><label className="toggle-label">显示合法落点 <input type="checkbox" checked={dests} onChange={e=>updateSettings({dests:e.target.checked})}/><span className="switch"/></label></div></section><section className="panel move-panel"><div className="move-heading"><strong>这一盘的足迹</strong><span>{Math.ceil(moves.length/2)} 回合</span></div>{!moves.length?<p className="muted">从你的第一步开始。</p>:<div className="move-list">{Array.from({length:Math.ceil(moves.length/2)},(_,i)=><div key={i}><span>{i+1}.</span><span>{moves[i*2]}</span><span>{moves[i*2+1]||'…'}</span></div>)}</div>}</section></aside></div>{newGameDialog&&<div className="modal-backdrop"><section className="modal panel" role="dialog" aria-modal="true" aria-label="开始新对局"><h2>准备好新的一盘了吗？</h2><p>当前对局会被替换。你可以先导出棋谱。</p><div className="side-choices"><button className="secondary" onClick={()=>restart('w')}><span>♙</span> 我执白 · 先走</button><button className="secondary" onClick={()=>restart('b')}><span>♟</span> 我执黑 · 后走</button></div><button className="text-button" onClick={()=>setNewGameDialog(false)}>继续当前对局</button></section></div>}</>;
}
