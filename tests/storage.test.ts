import {it,expect} from 'vitest';
import {freshProgress,validateProgress} from '../src/lib/storage';
it('进度往返保持设置、对局和完成记录',()=>{const p=freshProgress();p.lessons=['rook'];p.pgn='1. e4 e5';p.settings.side='b';expect(validateProgress(JSON.parse(JSON.stringify(p)))).toEqual(p);});
it('拒绝损坏、未知版本、未知 ID 和非法棋谱，不接受任意设置',()=>{
 for(const bad of [null,{version:2},{...freshProgress(),pgn:'1. e9'},{...freshProgress(),solved:['unknown']},{...freshProgress(),updatedAt:'bad'},{...freshProgress(),settings:{...freshProgress().settings,coach:'yes'}}])expect(()=>validateProgress(bad)).toThrow();
});
