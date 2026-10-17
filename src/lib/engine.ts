import type { EngineResult } from './chess';
export type EngineState='idle'|'loading'|'ready'|'thinking'|'error';
export type WorkerLike=Pick<Worker,'postMessage'|'terminate'|'onmessage'|'onerror'>;
export class Engine {
 private worker:WorkerLike|null=null;
 private generation=0;
 private tail:Promise<unknown>=Promise.resolve();
 private rejects=new Set<(e:Error)=>void>();
 private listener:((line:string)=>void)|null=null;
 constructor(private state:(state:EngineState)=>void=()=>{},private factory:()=>WorkerLike=()=>new Worker(import.meta.env.BASE_URL+'engine/stockfish-19-lite-single.js')){}
 private wait(match:(line:string)=>boolean,timeout:number,send:()=>void){return new Promise<void>((resolve,reject)=>{
  const fail=(e:Error)=>{clearTimeout(timer);this.rejects.delete(fail);this.listener=null;reject(e);};
  const timer=setTimeout(()=>fail(Error('棋力引擎响应超时，请重试。')),timeout);
  this.rejects.add(fail);this.listener=line=>{if(match(line)){clearTimeout(timer);this.rejects.delete(fail);this.listener=null;resolve();}};send();
 });}
 private async ready(){if(this.worker)return;this.state('loading');
  this.worker=this.factory();
  const worker=this.worker;
  this.worker.onmessage=event=>{if(this.worker!==worker)return;for(const line of String(event.data).split('\n'))this.listener?.(line);};
  this.worker.onerror=()=>{for(const reject of [...this.rejects])reject(Error('棋力引擎加载或运行失败，请检查网络后重试。'));this.cancel();this.state('error');};
  await this.wait(l=>l==='uciok',20000,()=>this.worker!.postMessage('uci'));
  await this.wait(l=>l==='readyok',10000,()=>this.worker!.postMessage('isready'));
  this.state('ready');
 }
 search(fen:string,options:{skill?:number;ms?:number;depth?:number;searchMoves?:string[]}={}):Promise<EngineResult>{
  const generation=this.generation;
  const task=async()=>{
   if(generation!==this.generation)throw new DOMException('Cancelled','AbortError');
   try{
    await this.ready();if(generation!==this.generation)throw new DOMException('Cancelled','AbortError');
    this.state('thinking');
    const result=await new Promise<EngineResult>((resolve,reject)=>{
     let last:EngineResult={best:'',depth:0,pv:[]};
     const fail=(e:Error)=>{clearTimeout(timer);this.rejects.delete(fail);this.listener=null;reject(e);};
     const timer=setTimeout(()=>fail(Error('棋力引擎思考超时，请重试。')),15000);
     this.rejects.add(fail);
     this.listener=line=>{
      if(line.startsWith('info ')&&line.includes(' score ')&&line.includes(' pv ')&&!/lowerbound|upperbound/.test(line)){
       const depth=Number(line.match(/\bdepth (\d+)/)?.[1]||0),cp=line.match(/\bscore cp (-?\d+)/),mate=line.match(/\bscore mate (-?\d+)/);
       last={best:'',depth,cp:cp?Number(cp[1]):undefined,mate:mate?Number(mate[1]):undefined,pv:line.split(' pv ')[1].trim().split(/\s+/)};
      }
      if(line.startsWith('bestmove ')){clearTimeout(timer);this.rejects.delete(fail);this.listener=null;resolve({...last,best:line.split(' ')[1]});}
     };
     for(const cmd of ['setoption name UCI_LimitStrength value false',`setoption name Skill Level value ${options.skill??20}`,'setoption name Hash value 16','setoption name MultiPV value 1',`position fen ${fen}`,`go movetime ${options.ms??500}${options.depth?` depth ${options.depth}`:''}${options.searchMoves?.length?` searchmoves ${options.searchMoves.join(' ')}`:''}`])this.worker!.postMessage(cmd);
    });
    if(generation!==this.generation)throw new DOMException('Cancelled','AbortError');
    this.state('ready');return result;
   }catch(error){if((error as Error).name!=='AbortError'){this.cancel();this.state('error');}throw error;}
  };
  const result=this.tail.then(task,task);this.tail=result.catch(()=>{});return result;
 }
 cancel(){this.generation++;if(this.worker){this.worker.onmessage=null;this.worker.onerror=null;this.worker.terminate();}this.worker=null;this.listener=null;for(const reject of [...this.rejects])reject(new DOMException('Cancelled','AbortError'));this.rejects.clear();this.tail=Promise.resolve();this.state('idle');}
}
