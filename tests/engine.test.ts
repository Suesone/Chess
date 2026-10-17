import {it,expect} from 'vitest';
import {Engine,type WorkerLike} from '../src/lib/engine';
class FakeWorker {
 onmessage:Worker['onmessage']=null;onerror:Worker['onerror']=null;commands:string[]=[];dead=false;
 emit(line:string){this.onmessage?.call(this as unknown as Worker,{data:line} as MessageEvent);}
 postMessage(command:string){this.commands.push(command);if(command==='uci')queueMicrotask(()=>this.emit('uciok'));if(command==='isready')queueMicrotask(()=>this.emit('readyok'));}
 terminate(){this.dead=true;}
}
const tick=()=>new Promise(r=>setTimeout(r,0));
it('请求串行执行，并解析最终有界评价',async()=>{const worker=new FakeWorker(),engine=new Engine(()=>{},()=>worker as WorkerLike);
 const a=engine.search('first'),b=engine.search('second');await tick();expect(worker.commands.filter(c=>c.startsWith('go'))).toHaveLength(1);
 worker.emit('info depth 12 score cp 28 pv e2e4 e7e5');worker.emit('info depth 13 score cp 50 lowerbound pv d2d4');worker.emit('bestmove e2e4');expect((await a).cp).toBe(28);
 await tick();expect(worker.commands.filter(c=>c.startsWith('go'))).toHaveLength(2);worker.emit('info depth 11 score mate 2 pv d2d4');worker.emit('bestmove d2d4');expect((await b).mate).toBe(2);engine.cancel();
});
it('取消活动及排队任务，忽略旧结果，可用新 worker 重试',async()=>{const workers:FakeWorker[]=[];const engine=new Engine(()=>{},()=>{const w=new FakeWorker();workers.push(w);return w as WorkerLike;});
 const a=engine.search('old').catch(e=>e.name),b=engine.search('queued').catch(e=>e.name);await tick();engine.cancel();expect(await a).toBe('AbortError');expect(await b).toBe('AbortError');expect(workers[0].dead).toBe(true);
 const next=engine.search('new');await tick();workers[0].emit('bestmove h2h4');workers[1].emit('info depth 10 score cp 0 pv e2e4');workers[1].emit('bestmove e2e4');expect((await next).best).toBe('e2e4');engine.cancel();
});
it('加载错误返回可重试错误，不伪装成用户取消',async()=>{const w=new FakeWorker();w.postMessage=()=>{};const engine=new Engine(()=>{},()=>w as WorkerLike);const pending=engine.search('start').catch(e=>e);await tick();w.onerror?.call(w as unknown as Worker,{} as ErrorEvent);const error=await pending;expect(error.name).not.toBe('AbortError');expect(error.message).toContain('失败');engine.cancel();});
