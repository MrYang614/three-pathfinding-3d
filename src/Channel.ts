import { Line3, Vector3 } from 'three';
import { Utils } from './Utils';

type Portal = {
    left: Vector3;
    right: Vector3;
};

export function funnel3D(start: Vector3, end: Vector3, portals?: Array<{ left: Vector3, right: Vector3; }>): Vector3[] {

    if (portals === undefined || portals.length === 0) {
        return [start, end];
    }

    if (portals[portals.length - 1].left.distanceToSquared(end) > 0.001) {
        portals.push({ left: end, right: end });
    }

    const path: Vector3[] = [start];

    // Init scan state
    let portalApex = start;
    let portalLeft = portals[0].left;
    let portalRight = portals[0].right;

    let apexIndex = 0,
        leftIndex = 0,
        rightIndex = 0;

    // record each two points cross how many portals

    for (let i = 1; i < portals.length; i++) {

        const left = portals[i].left;
        const right = portals[i].right;

        // Update right vertex.
        if (Utils.judgeDir(portalApex, portalRight, right) >= 0.0) {

            if (Utils.vequal(portalApex, portalRight) || Utils.judgeDir(portalApex, portalLeft, right) < 0.0) {
                // Tighten the funnel.
                portalRight = right;
                rightIndex = i;

            } else {

                insert(portalApex, portalLeft, apexIndex, leftIndex, portals, path);

                // Right over left, insert left to path and restart scan from portal left point.
                path.push(portalLeft);

                // Make current left the new apex.
                portalApex = portalLeft;
                apexIndex = leftIndex;
                // Reset portal

                portalRight = portalApex;
                rightIndex = apexIndex;
                // Restart scan
                i = apexIndex;

                continue;
            }
        }

        // Update left vertex.
        if (Utils.judgeDir(portalApex, portalLeft, left) <= 0.0) {

            if (Utils.vequal(portalApex, portalLeft) || Utils.judgeDir(portalApex, portalRight, left) > 0.0) {

                // Tighten the funnel.
                portalLeft = left;
                leftIndex = i;

            } else {

                insert(portalApex, portalRight, apexIndex, rightIndex, portals, path);

                // Left over right, insert right to path and restart scan from portal right point.

                path.push(portalRight);

                // Make current right the new apex.
                portalApex = portalRight;
                apexIndex = rightIndex;
                // Reset portal
                portalLeft = portalApex;

                leftIndex = apexIndex;

                // Restart scan
                i = apexIndex;

                continue;
            }
        }

    }

    if ((path.length === 0) || (!Utils.vequal(path[path.length - 1], portals[portals.length - 1].left))) {
        // Append last point to path.
        path.push(portals[portals.length - 1].left);
    }

    return path;

}

function insert(p1: Vector3, p2: Vector3, preIdx: number, endIdx: number, portals: Portal[], path: Vector3[]) {

    const lineSE = new Line3(p1, p2);

    for (let j = preIdx; j < endIdx - 1; j++) {

        const l = portals[j].left;
        const r = portals[j].right;

        const linePortal = new Line3(l, r);

        const dis = lineSE.distanceSqToLine3(linePortal);

        const intersect = new Vector3();

        if (dis > 0.01) {

            const l2 = new Vector3(l.x, 0, l.z);
            const r2 = new Vector3(r.x, 0, r.z);

            const lineSE2 = new Line3(new Vector3(p1.x, 0, p1.z), new Vector3(p2.x, 0, p2.z));
            const linePortal2 = new Line3(new Vector3(l.x, 0, l.z), new Vector3(r.x, 0, r.z));

            lineSE2.distanceSqToLine3(linePortal2, undefined, intersect);

            const delta = intersect.distanceTo(l2) / l2.distanceTo(r2);

            path.push(new Vector3().lerpVectors(l, r, delta));

        }

    }

}
