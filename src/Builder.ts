import { Vector3, type BufferGeometry } from 'three';

import { Utils } from './Utils';
import type { Polygon, Zone, NavMesh } from './type';

export const Builder = (function () {

    /**
     * Constructs groups from the given navigation mesh.
     * @param  {BufferGeometry} geometry
     * @param  {number} tolerance
     * @return {Zone}
     */
    function buildZone(geometry: BufferGeometry, tolerance: number = 0.0001): Zone {

        const navMesh = _buildNavigationMesh(geometry, tolerance);

        const zone: Zone = {} as Zone;

        navMesh.vertices.forEach((v) => {
            v.x = Utils.roundNumber(v.x, 2);
            v.y = Utils.roundNumber(v.y, 2);
            v.z = Utils.roundNumber(v.z, 2);
        });

        zone.vertices = navMesh.vertices;

        const groups = _buildPolygonGroups(navMesh);

        zone.groups = new Array(groups.length);
        const zone_vertices = zone.vertices;
        groups.forEach((group, groupIndex) => {

            const newGroup = new Array(group.length);
            group.forEach((poly, polyIndex) => {

                const poly_vertexIds = poly.vertexIds;

                const centroid = new Vector3(0, 0, 0);
                centroid.add(zone_vertices[poly_vertexIds[0]]);
                centroid.add(zone_vertices[poly_vertexIds[1]]);
                centroid.add(zone_vertices[poly_vertexIds[2]]);
                centroid.divideScalar(3);
                centroid.x = Utils.roundNumber(centroid.x, 2);
                centroid.y = Utils.roundNumber(centroid.y, 2);
                centroid.z = Utils.roundNumber(centroid.z, 2);

                newGroup[polyIndex] = {
                    id: polyIndex,
                    neighbours: poly.neighbours.map((n) => n.group_idx),
                    vertexIds: poly.vertexIds,
                    centroid: centroid,
                    portals: poly.portals
                };
            });

            zone.groups[groupIndex] = newGroup;
        });

        return zone;
    }

    /**
     * Constructs a navigation mesh from the given geometry.
     * @param {BufferGeometry} geometry
     * @return {Object}
     */
    function _buildNavigationMesh(geometry: BufferGeometry, tolerance: number = 0.0001): NavMesh {
        geometry = Utils.mergeVertices(geometry, tolerance);
        return _buildPolygonsFromGeometry(geometry);
    }

    /**
     * Spreads the group ID of the given polygon to all connected polygons
     * @param {Object} seed
     */
    function _spreadGroupId(seed: Polygon) {
        let nextBatch = new Set([seed]);

        while (nextBatch.size > 0) {
            const batch = nextBatch;
            nextBatch = new Set();

            batch.forEach((polygon) => {
                polygon.group = seed.group;
                polygon.neighbours.forEach((neighbour) => {
                    if (neighbour.group === undefined) {
                        nextBatch.add(neighbour);
                    }
                });
            });
        }
    }

    function _buildPolygonGroups(navigationMesh: NavMesh) {

        const polygons = navigationMesh.polygons;

        const polygonGroups: Polygon[][] = [];

        polygons.forEach((polygon) => {
            if (polygon.group !== undefined) {
                // this polygon is already part of a group
                polygon.group_idx = polygonGroups[polygon.group].length;
                polygonGroups[polygon.group].push(polygon);
            } else {
                // we need to make a new group and spread its ID to neighbors
                polygon.group = polygonGroups.length;
                polygon.group_idx = 0;
                _spreadGroupId(polygon);
                polygonGroups.push([polygon]);
            }
        });

        return polygonGroups;
    }

    function _buildPolygonNeighbours(polygon: Polygon, vertexPolygonMap: Polygon[][]) {

        const vertexIdx = polygon.vertexIds;

        const [a, b, c] = vertexIdx;
        const groupA = vertexPolygonMap[a];
        const groupB = vertexPolygonMap[b];
        const groupC = vertexPolygonMap[c];

        // It's only necessary to iterate groups A and B. Polygons contained only
        // in group C cannot share a >1 vertex with this polygon.
        // IMPORTANT: Bublé cannot compile for-of loops.
        groupA.forEach((candidate) => {
            if (candidate === polygon) return;
            if (groupB.includes(candidate)) {
                bind_neighbor(polygon, candidate, a, b);
            }
            if (groupC.includes(candidate)) {
                bind_neighbor(polygon, candidate, a, c);
            }
        });

        groupB.forEach((candidate) => {
            if (candidate === polygon) return;
            if (groupC.includes(candidate)) {
                bind_neighbor(polygon, candidate, b, c);
            }
        });

        function bind_neighbor(polygon1: Polygon, polygon2: Polygon, x: number, y: number) {
            if (polygon1.neighbours.includes(polygon2)) return;
            polygon1.neighbours.push(polygon2);
            polygon1.portals.push([x, y]);
            polygon2.neighbours.push(polygon);
            polygon2.portals.push([x, y]);
        }

    }

    function _buildPolygonsFromGeometry(geometry: BufferGeometry) {

        const position = geometry.attributes.position;
        const index = geometry.index;

        const polygons: Polygon[] = new Array(index.count / 3);
        const vertices = new Array(position.count);
        const vertexPolygonMap = new Array(index.count / 3);

        // Constructing the neighbor graph brute force is O(n²). To avoid that,
        // create a map from vertices to the polygons that contain them, and use it
        // while connecting polygons. This reduces complexity to O(n*m), where 'm'
        // is related to connectivity of the mesh.

        /** Array of polygon objects by vertex index. */
        for (let i = 0; i < position.count; i++) {
            vertices[i] = new Vector3().fromBufferAttribute(position, i);
            vertexPolygonMap[i] = [];
        }

        for (let i = 0; i < index.count; i += 3) {
            const a = index.getX(i);
            const b = index.getX(i + 1);
            const c = index.getX(i + 2);
            const poly = { vertexIds: [a, b, c], neighbours: [], portals: [] } as Polygon;;
            polygons[i / 3] = poly;
            vertexPolygonMap[a].push(poly);
            vertexPolygonMap[b].push(poly);
            vertexPolygonMap[c].push(poly);
        }

        // 优化

        // Build a list of adjacent polygons
        polygons.forEach((polygon) => _buildPolygonNeighbours(polygon, vertexPolygonMap));

        return {
            polygons: polygons,
            vertices: vertices
        };
    }

    return {
        buildZone: buildZone,
    };

}());

