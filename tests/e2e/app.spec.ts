import {test,expect,type Page} from '@playwright/test';
import {Chess} from 'chess.js';
import puzzles from '../../src/content/puzzles.json' with {type:'json'};
async function move(page:Page,uci:string,orientation:'w'|'b'='w'){
 const board=page.locator('.chessboard').last();await board.scrollIntoViewIfNeeded();const box=await board.boundingBox();if(!box)throw Error('No board');
 const point=(square:string)=>{let x=square.charCodeAt(0)-97,y=8-Number(square[1]);if(orientation==='b'){x=7-x;y=7-y;}return {x:(x+.5)*box.width/8,y:(y+.5)*box.height/8};};
 if(Boolean(test.info().project.use.hasTouch)){for(const square of [uci.slice(0,2),uci.slice(2,4)]){const p=point(square);await page.touchscreen.tap(box.x+p.x,box.y+p.y);}}else{await board.click({position:point(uci.slice(0,2))});await board.click({position:point(uci.slice(2,4))});}
 if(uci[4])await page.getByRole('dialog',{name:'选择升变棋子'}).getByRole('button',{name:({q:'后',r:'车',b:'象',n:'马'} as Record<string,string>)[uci[4]],exact:true}).click();
}
test('首页布局、课程→练习→实战，刷新保持进度',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await expect(page.getByRole('heading',{name:/好棋/})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`test-results/home-${info.project.name}.png`,fullPage:true});
 await page.getByRole('button',{name:'从零开始学棋'}).click();
 await expect(page.locator('.move-demonstration')).toHaveCount(1);
 await move(page,'e2e4');await expect(page.getByText('本课已完成，进度已记录')).toBeVisible();
 await page.reload();await expect(page.getByText('1 / 12 课已完成')).toBeVisible();
  await page.goto('/#train');await page.getByRole('button',{name:'给我一点提示'}).click();await expect(page.getByText('先找到能将军的走法，再封住逃跑路线。')).toBeVisible();
 const puzzle=puzzles.find(p=>p.theme==='mateIn1')!,c=new Chess(puzzle.startFen);
 const wrong=c.moves({verbose:true}).find(m=>{const g=new Chess(puzzle.startFen);g.move(m);return !g.isCheckmate();});
 if(wrong){await move(page,wrong.from+wrong.to+(wrong.promotion||''),c.turn());await expect(page.getByText(/这步没有完成/)).toBeVisible();}
 await move(page,puzzle.steps[0].uci,c.turn());await expect(page.getByRole('heading',{name:'又掌握了一点'})).toBeVisible();
 await page.getByRole('button',{name:'回看关键变化'}).click();await expect(page.getByRole('button',{name:'同主题下一题'})).toBeEnabled({timeout:5000});
 await page.getByRole('button',{name:'到实战里试试看'}).click();await expect(page.getByRole('heading',{name:'下一盘，学一点'})).toBeVisible();
 expect(errors).toEqual([]);
});
test('真实 Stockfish 对弈、求助、悔棋与重开',async({page})=>{
 await page.goto('/#play');await page.getByRole('checkbox',{name:'明显失误提醒'}).uncheck();await move(page,'e2e4');
 await expect(page.locator('.move-list')).toContainText('e4');await expect(page.getByText('白方走棋',{exact:true})).toBeVisible({timeout:25000});
 await page.getByRole('button',{name:'帮我看看下一步'}).click();await expect(page.locator('.coach-message')).toContainText('→',{timeout:20000});
 await page.getByRole('button',{name:'悔棋',exact:true}).click();await expect(page.getByText('从你的第一步开始。')).toBeVisible();
 await page.getByRole('button',{name:'新的一盘'}).click();await page.getByRole('button',{name:'我执黑 · 后走'}).click();
 await page.getByRole('button',{name:'新的一盘'}).click();await page.getByRole('button',{name:'我执白 · 先走'}).click();
 await expect(page.getByText('从你的第一步开始。')).toBeVisible();await page.waitForTimeout(1200);await expect(page.getByText('从你的第一步开始。')).toBeVisible();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('first-move.progress.v1')!));expect(saved.settings.side).toBe('w');
});
test('本地恢复、进度下载与校验导入',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'打开进度与设置'}).click();
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'导出进度备份'}).click();expect((await download).suggestedFilename()).toContain('学习进度.json');
 await page.locator('input[type=file]').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"version":2}')});await expect(page.getByRole('alert')).toContainText('不支持这个进度文件版本');
 const imported={version:1,lessons:['board'],solved:[],mistakes:[],settings:{level:'beginner',side:'w',coach:true,dests:true},pgn:'1. e4 e5',updatedAt:new Date().toISOString()};
 await page.locator('input[type=file]').setInputFiles({name:'progress.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(imported))});
 await expect(page.getByRole('heading',{name:'确认替换本机进度？'})).toBeVisible();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('first-move.progress.v1')!).lessons)).toEqual([]);
 await page.getByRole('button',{name:'确认覆盖并导入'}).click();await page.goto('/#play');await expect(page.locator('.move-list')).toContainText('e5');await page.reload();await expect(page.locator('.move-list')).toContainText('e5');
});
test('升变选择与特殊规则课程',async({page})=>{
 await page.goto('/#learn');await page.getByRole('button',{name:/升变与吃过路兵/}).click();
 await move(page,'a7a8q');await expect(page.getByRole('heading',{name:'做得好，理解了！'})).toBeVisible();await page.getByRole('button',{name:'下一项练习'}).click();
 await move(page,'e5d6');await expect(page.getByText('本课已完成，进度已记录')).toBeVisible();
 await page.getByRole('button',{name:/王车易位/}).click();await move(page,'e1g1');await expect(page.getByRole('heading',{name:'做得好，理解了！'})).toBeVisible();
});
test('引擎失败后显示重试，切换页面可继续学习',async({page})=>{
 await page.route('**/engine/stockfish-19-lite-single.js',route=>route.abort());await page.goto('/#play');await move(page,'e2e4');
 await expect(page.getByRole('button',{name:'重新连接引擎'})).toBeVisible({timeout:25000});
 await page.unroute('**/engine/stockfish-19-lite-single.js');await page.getByRole('button',{name:'重新连接引擎'}).click();
 await expect(page.getByText('白方走棋',{exact:true})).toBeVisible({timeout:25000});await page.goto('/#learn');await expect(page.getByRole('heading',{name:'认识棋盘'})).toBeVisible();
});
test('明显失误暂停、重试与继续均可完成',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('first-move.progress.v1',JSON.stringify({version:1,lessons:[],solved:[],mistakes:[],settings:{level:'challenge',side:'w',coach:true,dests:true},pgn:'1. f3 e5',updatedAt:new Date().toISOString()})));
 await page.goto('/#play');await expect(page.locator('.move-list')).toContainText('e5');await move(page,'g2g4');await expect(page.getByRole('button',{name:'退回这一步，重新试试'})).toBeVisible({timeout:25000});
 await page.getByRole('button',{name:'退回这一步，重新试试'}).click();await expect(page.locator('.move-list')).not.toContainText('g4');
 await move(page,'g2g4');await expect(page.getByRole('button',{name:'继续实战',exact:true})).toBeVisible({timeout:25000});await page.getByRole('button',{name:'继续实战',exact:true}).click();
 await expect(page.getByRole('heading',{name:'黑方获胜 · 将死'})).toBeVisible({timeout:20000});
});

test('棋盘拖动或触屏点选可用，源码与许可可以下载',async({page},info)=>{
 await page.goto('/#learn');await page.getByRole('button',{name:/车：直线行走/}).click();
 if(Boolean(test.info().project.use.hasTouch)){await move(page,'a1a7');}else{
  const board=page.locator('.chessboard');await board.scrollIntoViewIfNeeded();const b=(await board.boundingBox())!;await page.mouse.move(b.x+b.width/16,b.y+b.height*15/16);await page.mouse.down();await page.mouse.move(b.x+b.width/16,b.y+b.height*3/16,{steps:12});await page.mouse.up();
 }
 await expect(page.getByRole('heading',{name:'做得好，理解了！'})).toBeVisible();
 await page.screenshot({path:`test-results/lesson-${info.project.name}.png`,fullPage:true});
 const source=await page.request.get('/source.zip');expect(source.ok()).toBe(true);expect((await source.body()).subarray(0,2).toString()).toBe('PK');
 expect((await page.request.get('/engine/stockfish-19-lite-single.wasm')).headers()['content-type']).toContain('application/wasm');
});

test('坐标居中对齐格子外沿，翻转棋盘后顺序正确',async({page})=>{
 await page.goto('/#play');
 async function coordinates(files:string,ranks:string){
  const board=await page.locator('cg-board').boundingBox();if(!board)throw Error('No board');
  const geometry=await page.locator('.board-files span, .board-ranks span').evaluateAll(es=>es.map(e=>({text:e.textContent,kind:e.parentElement!.className,box:e.getBoundingClientRect().toJSON()})));
  expect(geometry.filter(e=>e.kind==='board-files').map(e=>e.text).join('')).toBe(files);expect(geometry.filter(e=>e.kind==='board-ranks').map(e=>e.text).join('')).toBe(ranks);
  for(const kind of ['board-files','board-ranks'])geometry.filter(e=>e.kind===kind).forEach((e,i)=>{
   const center=kind==='board-files'?e.box.x+e.box.width/2:e.box.y+e.box.height/2;
   const expected=kind==='board-files'?board.x+board.width*(i+.5)/8:board.y+board.height*(i+.5)/8;
   expect(Math.abs(center-expected)).toBeLessThan(1);
   if(kind==='board-files')expect(e.box.y).toBeGreaterThanOrEqual(board.y+board.height-.1);else expect(e.box.x+e.box.width).toBeLessThanOrEqual(board.x+.1);
  });
 }
 await coordinates('abcdefgh','87654321');await page.getByRole('button',{name:'新的一盘'}).click();await page.getByRole('button',{name:'我执黑 · 后走'}).click();await expect(page.locator('.board-files span').first()).toHaveText('h');await coordinates('hgfedcba','12345678');
});
test('动态示范期间可直接操作，错走后仍可沿路线重试',async({page},info)=>{
 await page.goto('/#learn');await page.getByRole('button',{name:/车：直线行走/}).click();
 const ghost=page.locator('.move-demonstration');await expect(ghost).toHaveCount(1);
 const initial=await ghost.evaluate(e=>getComputedStyle(e).transform);await expect.poll(()=>ghost.evaluate(e=>getComputedStyle(e).transform)).not.toBe(initial);
 await move(page,'a1a6');await expect(page.getByText(/沿展示的路线重新尝试/)).toBeVisible();
 await page.getByRole('button',{name:'重看路线'}).click();await move(page,'a1a7');await expect(page.getByRole('heading',{name:'做得好，理解了！'})).toBeVisible();await expect(ghost).toHaveCount(0);
 await page.getByRole('button',{name:/马：跳一个 L/}).click();await expect(ghost).toHaveCount(1);
 await ghost.evaluate(img=>(img as HTMLImageElement).decode());await page.screenshot({path:`test-results/guided-${info.project.name}.png`,fullPage:true});await move(page,'g1f3');await expect(page.getByText('本课已完成，进度已记录')).toBeVisible();
});

async function equivalentFixture(page:Page){
 const original=puzzles.find(p=>p.theme==='hangingPiece')!;
 const fen='7k/8/8/R2q4/8/8/8/3R3K w - - 0 1',game=new Chess(fen);
 const steps=['a5d5','h8g8','d5d8'].map(uci=>{const m=game.move({from:uci.slice(0,2),to:uci.slice(2,4)});return {uci,san:m.san,text:m.san};});
 const fixture=puzzles.map(p=>p.id===original.id?{...p,startFen:fen,steps}:p);
 await page.route(/\/src\/content\/puzzles\.json(?:\?.*)?$/,route=>route.fulfill({contentType:'application/javascript',body:`export default ${JSON.stringify(fixture)}`}));
 await page.goto('/#train');await page.getByRole('button',{name:/无保护棋子/}).click();
 return original.id;
}
test('同题两种直接将死均通过，回放采用实际走法',async({page})=>{
 const puzzle=puzzles.find(p=>p.id==='001KR')!;
 await page.addInitScript(({id})=>localStorage.setItem('first-move.progress.v1',JSON.stringify({version:1,lessons:[],solved:[],mistakes:[id],settings:{level:'beginner',side:'w',coach:true,dests:true},pgn:'',updatedAt:new Date().toISOString()})),{id:puzzle.id});
 await page.goto('/#train');await page.getByRole('button',{name:/错题重练/}).click();
 await move(page,'d1d8');await expect(page.getByRole('heading',{name:'又掌握了一点'})).toBeVisible();
 await expect(page.locator('.solution-list')).toContainText('Rd8#');await expect(page.locator('.solution-list')).not.toContainText('Rf8#');
 await page.getByRole('button',{name:'回看关键变化'}).click();await expect(page.getByRole('button',{name:'同主题下一题'})).toBeEnabled({timeout:5000});
});
test('真实引擎接受等效吃子，后续提示与回放沿新的解法',async({page})=>{
 test.setTimeout(45000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const id=await equivalentFixture(page);await move(page,'d1d5');
 await expect(page.getByText('对方已经应对。继续完成下一步。')).toBeVisible({timeout:20000});
 for(let i=0;i<3;i++)await page.getByRole('button',{name:i===0?'给我一点提示':/再提示一点/}).click();
 const hint=await page.locator('.hint-line').last().textContent(),squares=hint!.match(/([a-h][1-8]) → ([a-h][1-8])/)!;
 await move(page,squares[1]+squares[2]);await expect(page.getByRole('heading',{name:'又掌握了一点'})).toBeVisible();
 await expect(page.locator('.solution-list')).toContainText('Rdxd5');await expect(page.locator('.solution-list')).not.toContainText('Raxd5');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('first-move.progress.v1')!));expect(saved.solved).toContain(id);expect(saved.mistakes).not.toContain(id);
 await page.getByRole('button',{name:'回看关键变化'}).click();await expect(page.getByRole('button',{name:'同主题下一题'})).toBeEnabled({timeout:6000});expect(errors).toEqual([]);
});
test('战术核验失败不记错，切换主题取消旧任务',async({page})=>{
 await page.route('**/engine/stockfish-19-lite-single.js',route=>route.abort());const id=await equivalentFixture(page);await move(page,'d1d5');
 await expect(page.getByRole('button',{name:'重新核验这一步'})).toBeVisible({timeout:25000});
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('first-move.progress.v1')!).mistakes)).not.toContain(id);
 await page.unroute('**/engine/stockfish-19-lite-single.js');await page.getByRole('button',{name:'重新核验这一步'}).click();
 await page.getByRole('button',{name:/一步将死/}).click();await expect(page.getByText('先看懂，再出手')).toBeVisible();
 await page.waitForTimeout(1200);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('first-move.progress.v1')!).solved)).not.toContain(id);
 await expect(page.locator('.player-label')).not.toContainText('无保护棋子');
});
