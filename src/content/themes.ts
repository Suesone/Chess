export const themes = [
 {id:'mateIn1', name:'一步将死',symbol:'#',intro:'找到一着将军，让对方的王无处可逃。',tip:'先找将军，再检查吃子、挡子和逃跑能否解将。'},
 {id:'fork',name:'捉双',symbol:'♞',intro:'一次出击，同时制造两个威胁。',tip:'寻找同时攻击王、后或车的机会。带将军的捉双尤其有力。'},
 {id:'pin',name:'牵制',symbol:'⤢',intro:'前面的棋子不敢动，因为后面更重要。',tip:'沿车、象、后的攻击线观察：一个棋子后面是否是王或更重要的棋子？'},
 {id:'skewer',name:'串击',symbol:'↗',intro:'攻击前面的重要棋子，赢得后面的目标。',tip:'寻找在同一条直线或斜线上的两个目标，逼前面的棋子让开。'},
 {id:'discoveredAttack',name:'闪击',symbol:'✧',intro:'移开一个棋子，打开另一个棋子的攻击线。',tip:'寻找被自己的棋子挡住的车、象或后。移开挡子，可能同时创造两种威胁。'},
 {id:'hangingPiece',name:'无保护棋子',symbol:'◇',intro:'先看谁没有保护，再判断能否安全吃掉。',tip:'检查对方的每个棋子：吃掉它以后，对方能否吃回来或制造更强威胁？'}
] as const;
export type ThemeId = typeof themes[number]['id'];
