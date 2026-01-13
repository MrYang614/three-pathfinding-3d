# three-pathfinding-3d

#### 介绍

PS: 由于 three-pathfinding 作者目前没有维护，提交的pr也没有得到反馈，所以自己新建了一个库，其中大部分代码从 three-pathfinding 拷贝而来，解决此库未解决的几个问题。

联系我:email：526838933@qq.com

three-pathfingding-3d 由 three-pathfinding 优化而来，修复了该库存在的几个已知问题：

1. funnel 算法缺失第一通道，该问题导致最终路径错误
2. funnel 算法没有针对3d场景进行优化，该问题导致在特殊情况下，实际路径与算法生成路径差距过大，很多情况会异常中断算法执行。

该库解决了第一个问题，将缺失的第一通道补充。

该库解决了第二个问题，优化 funnel => funnel3d 使其在 3d 情况下能够生成合适的路径。

#### 使用说明

```
npm i three-pathfinding-3d 

import { Pathfinding, PathfindingHelper } from "three-pathfinding-3d"

```

```
git clone https://gitee.com/yjsdszz/three-pathfinding-3d

cd demo

npm i 

npm run dev
```


