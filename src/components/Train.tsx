import {useEffect,useMemo,useRef,useState} from 'react';
import {Chess} from 'chess.js';
import {ArrowRight,Lightbulb,RotateCcw,Check,Play,ListFilter} from 'lucide-react';
import data from '../content/puzzles.json';
import {themes} from '../content/themes';
import type {Progress} from '../lib/storage';
import {moveUci,pieceNames,type EngineResult} from '../lib/chess';
import {Engine} from '../lib/engine';
import {judgePuzzleMove,type PuzzleStep} from '../lib/puzzle';
import {Board} from './Board';

export function Train({progress,record,initialTheme,onPlay}:{progress:Progress;record:(id:string,correct:boolean)=>void;initialTheme?:string;onPlay:()=>void}){
 const [theme,setTheme]=useState(initialTheme||'mateIn1'),[wrongOnly,setWrongOnly]=useState(false),[index,setIndex]=useState(0);
 const list=useMemo(()=>data.filter(p=>p.theme===theme&&(!wrongOnly||progress.mistakes.includes(p.id))),[theme,wrongOnly,progress.mistakes]);
 const puzzle=list[Math.min(index,list.length-1)],info=themes.find(t=>t.id===theme)!;
 const [fen,setFen]=useState(puzzle?.startFen||new Chess().fen()),[cursor,setCursor]=useState(0),[hints,setHints]=useState(0),[done,setDone]=useState(false),[feedback,setFeedback]=useState(''),[busy,setBusy]=useState(false),[replaying,setReplaying]=useState(false),[lastMove,setLastMove]=useState<string>();
 const [steps,setSteps]=useState<PuzzleStep[]>(puzzle?.steps||[]),[alternative,setAlternative]=useState(false),[retryMove,setRetryMove]=useState<string>();
 const timers=useRef<ReturnType<typeof setTimeout>[]>([]),revision=useRef(0),inFlight=useRef(false);
 const engine=useRef<Engine|null>(null),cache=useRef(new Map<string,EngineResult>());
 if(!engine.current)engine.current=new Engine();
 const clear=()=>{revision.current++;timers.current.forEach(clearTimeout);timers.current=[];engine.current?.cancel();inFlight.current=false;};
 function reset(){
  clear();if(puzzle)setFen(puzzle.startFen);setSteps(puzzle?.steps||[]);setCursor(0);setHints(0);setDone(false);setBusy(false);setReplaying(false);setFeedback('');setLastMove(undefined);setAlternative(false);setRetryMove(undefined);cache.current.clear();
 }
 useEffect(()=>{reset();return clear;},[puzzle?.id]);
 function next(){clear();setIndex(i=>(i+1)%list.length);if(list.length===1)reset();}
 async function move(uci:string){
  if(!puzzle||busy||done||inFlight.current)return;
  const expected=steps[cursor]?.uci;if(!expected)return;
  inFlight.current=true;const gen=revision.current;let scheduled=false;
  setBusy(true);setRetryMove(undefined);
  if(uci!==expected&&puzzle.theme!=='mateIn1')setFeedback('正在核验另一种走法，请稍候…');
  try{
   const verdict=await judgePuzzleMove({fen,move:uci,expected,theme:puzzle.theme,remainingPlies:steps.length-cursor,search:async(position,options)=>{
    const key=position+'|'+options.searchMoves.join(' '),cached=cache.current.get(key);
    if(cached)return cached;
    const result=await engine.current!.search(position,options);
    if(gen===revision.current&&result.depth>=options.depth)cache.current.set(key,result);
    return result;
   }});
   if(gen!==revision.current)return;
   if(verdict.kind==='uncertain'){setFeedback(verdict.message);setRetryMove(uci);return;}
   if(verdict.kind==='incorrect'){record(puzzle.id,false);setFeedback('这步没有完成题目的目标。棋盘已恢复，试着先看将军、吃子和威胁。');return;}
   const line=verdict.continuation?[...steps.slice(0,cursor),...verdict.continuation]:steps;
   if(verdict.continuation){setSteps(line);setAlternative(true);}
   const c=new Chess(fen);moveUci(c,uci);setFen(c.fen());setLastMove(uci);setHints(0);
   const after=cursor+1;
   if(after>=line.length||c.isGameOver()){
    setDone(true);setFeedback(verdict.continuation?'这也是成立的解法！已核验并记录完成。':'完成了！回看关键变化，把这个技巧带进实战。');record(puzzle.id,true);return;
   }
   scheduled=true;setFeedback(verdict.continuation?'这也是成立的走法，接着看对方如何应对…':'这步正确，看看对方如何应对…');
   timers.current.push(setTimeout(()=>{
    if(gen!==revision.current)return;
    const reply=line[after];moveUci(c,reply.uci);setFen(c.fen());setLastMove(reply.uci);setCursor(after+1);setBusy(false);inFlight.current=false;
    if(after+1>=line.length||c.isGameOver()){setDone(true);record(puzzle.id,true);setFeedback('完成了！这条解法已核验。');}
    else setFeedback('对方已经应对。继续完成下一步。');
   },650));
  }catch(error){
   if(gen===revision.current&&(error as Error).name!=='AbortError'){setFeedback('暂时无法核验这一步，此次不记错题，可以重新核验。');setRetryMove(uci);}
  }finally{if(gen===revision.current&&!scheduled){inFlight.current=false;setBusy(false);}}
 }
 function replay(){
  if(!puzzle)return;clear();setReplaying(true);setBusy(true);inFlight.current=true;setFen(puzzle.startFen);setLastMove(undefined);
  const c=new Chess(puzzle.startFen),gen=revision.current;
  steps.forEach((s,i)=>timers.current.push(setTimeout(()=>{
   if(gen!==revision.current)return;
   moveUci(c,s.uci);setFen(c.fen());setLastMove(s.uci);setFeedback(s.text);
   if(i===steps.length-1){setBusy(false);setReplaying(false);inFlight.current=false;}
  },800*(i+1))));
 }
 const current=steps[cursor]?.uci,arrow=puzzle&&hints>=3&&!done?current:undefined;
 function hintText(i:number){
  if(i===0)return alternative?'沿当前局面继续观察将军、吃子和威胁，巩固已经取得的优势。':puzzle?.hints[0];
  if(!current)return '';
  if(i===1){const piece=new Chess(fen).get(current.slice(0,2) as import('chess.js').Square);return `先观察 ${current.slice(0,2)} 的${piece?pieceNames[piece.type]:'棋子'}。`;}
  return `尝试 ${current.slice(0,2)} → ${current.slice(2,4)}${current[4]?'，升为'+pieceNames[current[4]]:''}。`;
 }
 return <><div className="section-heading"><div><div className="eyebrow">A LITTLE PRACTICE, EVERY DAY</div><h1>把技巧变成直觉</h1><p className="muted">先观察，再落子。每一道题，都是一次小小的进步。</p></div><button className={'secondary '+(wrongOnly?'selected':'')} onClick={()=>{reset();setWrongOnly(!wrongOnly);setIndex(0);}}><ListFilter size={16}/> {wrongOnly?'返回全部练习':`错题重练 · ${progress.mistakes.length}`}</button></div><div className="theme-grid">{themes.map(t=><button className={'theme-card '+(theme===t.id?'active':'')} key={t.id} onClick={()=>{reset();setTheme(t.id);setIndex(0);}}><span className="theme-symbol">{t.symbol}</span><span><strong>{t.name}</strong><small>{data.filter(p=>p.theme===t.id&&progress.solved.includes(p.id)).length} / 10 已完成</small></span></button>)}</div>{!puzzle?<div className="panel empty-state"><Check size={36}/><h2>这个主题还没有错题</h2><p>做错的题会留在这里，答对后仍可反复复习。</p><button className="primary" onClick={()=>setWrongOnly(false)}>开始主题练习 <ArrowRight size={17}/></button></div>:<div className="work-area training-area"><div><div className="player-label"><span className="avatar mini">{new Chess(puzzle.startFen).turn()==='w'?'♙':'♟'}</span><span>{new Chess(puzzle.startFen).turn()==='w'?'白方':'黑方'}走棋</span><span className="label-right">{index+1} / {list.length} · {puzzle.title}</span></div><Board key={puzzle.id} fen={fen} orientation={new Chess(puzzle.startFen).turn()} disabled={busy||done} onMove={move} arrow={arrow} lastMove={lastMove}/><div className="puzzle-meta"><span>实战选题 · 参考难度 {puzzle.rating}</span><a href={'https://lichess.org/training/'+puzzle.id} target="_blank" rel="noreferrer">题目来源 ↗</a></div></div><section className="coach-panel panel"><span className="coach-tag">{info.name} · {done?'练习完成':'主题带练'}</span><h2>{done?'又掌握了一点':'先看懂，再出手'}</h2><p>{info.intro}</p><div className="tip-box"><Lightbulb size={18}/><p>{info.tip}</p></div><p className={'feedback '+(done?'success':'')} aria-live="polite">{feedback||'这是对手上一手 '+puzzle.setupSan+' 之后的局面。观察棋盘，找出你的应对。'}</p>{!done?<>{retryMove&&<button className="secondary full" disabled={busy} onClick={()=>move(retryMove)}>重新核验这一步</button>}<button className="secondary full" disabled={busy||hints>=3} onClick={()=>setHints(n=>n+1)}><Lightbulb size={17}/> {hints===0?'给我一点提示':hints===3?'全部提示已展开':'再提示一点'} <span className="button-tail">{hints} / 3</span></button>{Array.from({length:hints},(_,i)=><p className="hint-line" key={i}><span>{i+1}</span>{hintText(i)}</p>)}<button className="text-button" disabled={busy} onClick={reset}><RotateCcw size={15}/> 重新观察</button></>:<>{alternative?<p>你找到了不同于题库参考路线的成立解法。下方展示本次核验并采用的变化。</p>:<p>{puzzle.explanation}</p>}<button className="secondary full" disabled={replaying} onClick={replay}><Play size={16}/> {replaying?'正在播放…':'回看关键变化'}</button><ol className="solution-list">{steps.map((s,i)=><li key={i}><strong>{s.san}</strong> {s.text}</li>)}</ol><button className="primary full" disabled={replaying} onClick={next}>同主题下一题 <ArrowRight size={17}/></button><button className="text-button" onClick={onPlay}>到实战里试试看 →</button></>}</section></div>}</>;
}
