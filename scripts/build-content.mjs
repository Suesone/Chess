import fs from 'node:fs';
import { Chess } from 'chess.js';
const names={p:'兵',n:'马',b:'象',r:'车',q:'后',k:'王'};
const general={mateIn1:['完成一步将死','先找到能将军的走法，再封住逃跑路线。'],fork:['制造或利用捉双','观察能同时威胁两个目标的走法，优先检查将军。'],pin:['制造或利用牵制','观察直线和斜线，找出不能轻易移动的防守棋子。'],skewer:['制造或利用串击','寻找一条线上前后排列的重要目标。'],discoveredAttack:['打开攻击线路','看看移开哪个棋子，能让后方的车、象或后开始攻击。'],hangingPiece:['赢得无保护棋子','检查可以吃掉的棋子，也要考虑对方的将军和反击。']};

const value={p:1,n:3,b:3,r:5,q:9,k:100};
function tacticalFact(before,after,m,theme){
 const side=m.color,enemy=side==='w'?'b':'w';
 const occupied=after.board().flat().filter(Boolean);
 if(theme==='mateIn1'&&after.isCheckmate())return `${names[m.piece]}来到 ${m.to} 将军。对方无法吃掉将军棋子、挡住攻击或把王移到安全格，因此这一着就是将死。`;
 if(theme==='fork'){
  const targets=occupied.filter(p=>p.color===enemy&&p.type!=='p'&&after.attackers(p.square,side).includes(m.to));
  if(targets.length>=2)return `${m.to} 的${names[m.piece]}同时攻击 ${targets.map(p=>p.square+' 的'+names[p.type]).join('、')}，形成捉双。对手应对其中一个威胁后，留意另一个目标。`;
 }
 if(theme==='pin'||theme==='skewer'){
  for(const board of [after,before])for(const p of board.board().flat().filter(Boolean)){
   if(p.color!==side||!['r','b','q'].includes(p.type))continue;
   for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
    if((p.type==='r'&&dx&&dy)||(p.type==='b'&&(!dx||!dy)))continue;
    const ray=[];let x=p.square.charCodeAt(0)-97+dx,y=Number(p.square[1])-1+dy;
    while(x>=0&&x<8&&y>=0&&y<8&&ray.length<2){const square=String.fromCharCode(97+x)+(y+1),target=board.get(square);if(target)ray.push({...target,square});x+=dx;y+=dy;}
    if(ray.length!==2||ray.some(t=>t.color!==enemy))continue;
    const [front,back]=ray;
    if(theme==='pin'&&value[back.type]>value[front.type])return `观察 ${p.square} 的${names[p.type]}与 ${front.square}、${back.square} 这条攻击线：前面的${names[front.type]}挡住了对后方${names[back.type]}的攻击${back.type==='k'?'，不能走开暴露王':'，移动它可能损失更重要的棋子'}。这是牵制的关键。`;
    if(theme==='skewer'&&value[front.type]>value[back.type])return `在关键变化中，${p.square} 的${names[p.type]}沿一条线攻击 ${front.square} 的${names[front.type]}，后面还有 ${back.square} 的${names[back.type]}。前方目标离开这条线时，后方目标就会暴露。`;
   }
  }
 }
 if(theme==='discoveredAttack'){
  for(const p of occupied.filter(p=>p.color===side&&p.square!==m.to&&['r','b','q'].includes(p.type))){
   const target=occupied.find(t=>t.color===enemy&&after.attackers(t.square,side).includes(p.square)&&!before.attackers(t.square,side).includes(p.square));
   if(target)return `移开 ${m.from} 的${names[m.piece]}后，${p.square} 的${names[p.type]}打开了对 ${target.square} 的${names[target.type]}的攻击线路。移动的棋子和后方棋子可以配合制造威胁。`;
  }
 }
 if(theme==='hangingPiece'&&m.captured&&!after.isAttacked(m.to,enemy))return `${names[m.piece]}从 ${m.from} 吃到 ${m.to}，拿下了对方的${names[m.captured]}。落在 ${m.to} 的棋子此时没有受到对方直接攻击。吃子前仍要检查对手有没有将军等更强的反击。`;
 return '';
}

const rows=JSON.parse(fs.readFileSync('src/content/puzzles-source.json')).sort((a,b)=>a.theme.localeCompare(b.theme)||a.rating-b.rating);
const counters={};
const result=rows.map(row=>{
 const game=new Chess(row.fen); const setup=game.move(row.moves[0]); const startFen=game.fen();
 const first=game.moves({verbose:true}).find(m=>m.from+m.to+(m.promotion||'')===row.moves[1]);
 if(!first) throw Error(row.id+' invalid first move');
 const count=counters[row.theme]=(counters[row.theme]||0)+1;
 let fact='';
 const steps=row.moves.slice(1).map((uci,i)=>{
  const before=new Chess(game.fen());
  const m=game.move({from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4]});
  if(i%2===0&&!fact)fact=tacticalFact(before,game,m,row.theme);
  const text=`${m.color==='w'?'白方':'黑方'}${names[m.piece]}从 ${m.from} 到 ${m.to}${m.captured?`，吃掉${names[m.captured]}`:''}${m.promotion?`，升为${names[m.promotion]}`:''}${game.isCheckmate()?'，将死':game.isCheck()?'，将军':''}。`;
  return {uci,san:m.san,text};
 });
 return {...row,title:`练习 ${String(count).padStart(2,'0')}`,startFen,setupSan:setup.san,goal:general[row.theme][0],hints:[general[row.theme][1],`先观察 ${first.from} 的${first.color==='w'?'白':'黑'}${names[first.piece]}。`,`尝试 ${first.from} → ${first.to}${first.promotion?'，升为'+names[first.promotion]:''}。`],explanation:fact||`这道题从 ${first.from} 的${names[first.piece]}开始应对，重点是${general[row.theme][0]}。结合下方的实际吃子、将军和对手应对，观察这个主题在关键变化中如何发生。`,steps};
});
fs.writeFileSync('src/content/puzzles.json',JSON.stringify(result,null,2)+'\n');
console.log('Validated and prepared',result.length,'unique puzzles');
