import {
    Vector3,
    Plane,
    Triangle,
    type BufferGeometry
} from 'three';

import { Utils } from './Utils';
import { AStar } from './AStar';
import { Builder } from './Builder';
import { funnel3D } from './Channel';

import type { Zone, GroupItem } from './type';

const $plane = new Plane();
const $point = new Vector3();
const $triangle = new Triangle();

/**
 * Defines an instance of the pathfinding module, with one or more zones.
 */
class Pathfinding {

    public zones: { [key: string]: Zone; };

    constructor() {
        this.zones = {};
    }

    /**
     * (Static) Builds a zone/node set from navigation mesh geometry.
     * @param geometry
     * @param tolerance Vertex welding tolerance.
     * @return
     */
    static createZone(geometry: BufferGeometry, tolerance = 1e-4) {
        return Builder.buildZone(geometry, tolerance);
    }

    /**
     * Sets data for the given zone.
     * @param zoneID
     * @param zone
     */
    setZoneData(zoneID: string, zone: Zone) {
        this.zones[zoneID] = zone;
    }

    /**
     * Returns the closest node to the target position.
     * @param position
     * @param zoneID
     * @param groupID
     * @param checkPolygon
     * @return
     */
    getClosestNode(position: Vector3, zoneID: string, groupID: number, checkPolygon = false) {
        const nodes = this.zones[zoneID].groups[groupID];
        const vertices = this.zones[zoneID].vertices;
        let closestNode: GroupItem = null;
        let closestDistance = Infinity;

        nodes.forEach((node) => {

            const distance = Utils.distanceToSquared(node.centroid, position);

            if (distance < closestDistance
                && (!checkPolygon || Utils.isVectorInPolygon(position, node, vertices))) {
                closestNode = node;
                closestDistance = distance;
            }
        });

        return closestNode;
    }

    /**
     * Returns a path between given start and end points. If a complete path
     * cannot be found, will return the nearest endpoint available.
     *
     * @param startPosition Start position.
     * @param targetPosition Destination.
     * @param zoneID ID of current zone.
     * @param groupID Current group ID.
     * @return  Array of points defining the path.
     */
    findPath(startPosition: Vector3, targetPosition: Vector3, zoneID: string, groupID: number) {
        const nodes = this.zones[zoneID].groups[groupID];
        const vertices = this.zones[zoneID].vertices;

        const closestNode = this.getClosestNode(startPosition, zoneID, groupID, true);
        const farthestNode = this.getClosestNode(targetPosition, zoneID, groupID, true);

        // If we can't find any node, just go straight to the target
        if (!closestNode || !farthestNode) {
            return null;
        }

        const paths = AStar.search(nodes, closestNode, farthestNode);

        const nodePath = [...paths];

        const getPortalFromTo = function (a: GroupItem, b: GroupItem) {
            for (var i = 0; i < a.neighbours.length; i++) {
                if (a.neighbours[i] === b.id) {
                    return a.portals[i];
                }
            }
        };

        // We have the corridor, now pull the rope.

        // channel.push(startPosition);

        const channelPortals = [];

        if (paths.length) {
            const portal1 = getPortalFromTo(closestNode, paths[0]);
            channelPortals.push({
                left: vertices[portal1[0]],
                right: vertices[portal1[1]]
            });
        }

        for (let i = 0; i < paths.length; i++) {
            const polygon = paths[i];
            const nextPolygon = paths[i + 1];

            if (nextPolygon) {
                const portals = getPortalFromTo(polygon, nextPolygon);
                channelPortals.push(
                    {
                        left: vertices[portals[0]],
                        right: vertices[portals[1]]
                    }
                );
            }
        }
        channelPortals.push({
            left: targetPosition,
            right: targetPosition
        });

        const channelPath: { left: Vector3, right: Vector3; }[] = [...channelPortals];

        const path = funnel3D(startPosition, targetPosition, channelPortals);

        // Return the path, omitting first position (which is already known).
        // const path = channel.path.map((c) => new Vector3(c.x, c.y, c.z));
        path.shift();

        return {
            path,
            nodePath: nodePath,
            channelPath: channelPath
        };
    }

    getGroup(zoneID: string, position: Vector3, checkPolygon: boolean = false): number {
        if (!this.zones[zoneID]) return null;

        let closestNodeGroup = null;
        let distance = Math.pow(50, 2);
        const zone = this.zones[zoneID];

        for (let i = 0; i < zone.groups.length; i++) {
            const group = zone.groups[i];
            for (const node of group) {
                if (checkPolygon) {
                    $plane.setFromCoplanarPoints(
                        zone.vertices[node.vertexIds[0]],
                        zone.vertices[node.vertexIds[1]],
                        zone.vertices[node.vertexIds[2]]
                    );
                    if (Math.abs($plane.distanceToPoint(position)) < 0.01) {
                        const poly = [
                            zone.vertices[node.vertexIds[0]],
                            zone.vertices[node.vertexIds[1]],
                            zone.vertices[node.vertexIds[2]]
                        ];
                        if (Utils.isPointInTriangle(poly, position)) {
                            return i;
                        }
                    }
                }
                const measuredDistance = Utils.distanceToSquared(node.centroid, position);
                if (measuredDistance < distance) {
                    closestNodeGroup = i;
                    distance = measuredDistance;
                }
            }
        }

        return closestNodeGroup;
    };

    /**
     * Clamps a step along the navmesh, given start and desired endpoint. May be
     * used to constrain first-person / WASD controls.
     *
     * @param  start start point
     * @param  end Desired end point.
     * @param  zoneID
     * @param  groupID
     * @param  endTarget Updated endpoint.
     * @return  Updated node.
     */
    clampStep(startRef: Vector3, endRef: Vector3, zoneID: string, groupID: number, endTarget: Vector3): GroupItem {

        const closestPlayerNode = this.getClosestNode(startRef, zoneID, groupID);

        const vertices = this.zones[zoneID].vertices;
        const nodes = this.zones[zoneID].groups[groupID];

        const nodeQueue = [closestPlayerNode];
        const nodeDepth = {};
        nodeDepth[closestPlayerNode.id] = 0;

        const endPoint = new Vector3();

        let closestNode = undefined;
        let closestPoint = new Vector3();
        let closestDistance = Infinity;

        // Project the step along the current closestPlayerNode.
        $plane.setFromCoplanarPoints(
            vertices[closestPlayerNode.vertexIds[0]],
            vertices[closestPlayerNode.vertexIds[1]],
            vertices[closestPlayerNode.vertexIds[2]]
        );
        $plane.projectPoint(endRef, $point);
        endPoint.copy($point);

        for (let currentNode = nodeQueue.pop(); currentNode; currentNode = nodeQueue.pop()) {

            $triangle.set(
                vertices[currentNode.vertexIds[0]],
                vertices[currentNode.vertexIds[1]],
                vertices[currentNode.vertexIds[2]]
            );

            $triangle.closestPointToPoint(endPoint, $point);

            if ($point.distanceToSquared(endPoint) < closestDistance) {
                closestNode = currentNode;
                closestPoint.copy($point);
                closestDistance = $point.distanceToSquared(endPoint);
            }

            const depth = nodeDepth[currentNode.id];
            if (depth > 2) continue;

            for (let i = 0; i < currentNode.neighbours.length; i++) {
                const neighbour = nodes[currentNode.neighbours[i]];
                if (neighbour.id in nodeDepth) continue;

                nodeQueue.push(neighbour);
                nodeDepth[neighbour.id] = depth + 1;
            }
        }

        endTarget.copy(closestPoint);
        return closestNode;

    }

}


export { Pathfinding };