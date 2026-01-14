import type { Vector3 } from "three";

/**
 * Defines a node (or polygon) within a group.
 */
type Node = {

    id: number;

    /**
     * IDs of neighboring nodes.
     */
    neighbours: number[];

    vertexIds: number[];

    centroid: Vector3;

    /**
     * Array of portals, each defined by two vertex IDs.
     */
    portals: number[][];

    closed: boolean;

    cost: number;

    group: number;

};

type Polygon = {
    group: number,
    neighbours: Polygon[];
    vertexIds: number[];
    group_idx?: number;
    portals: number[][];
};

/**
 * Defines a zone of interconnected groups on a navigation mesh.
 */
type Zone = {
    groups: Group[];
    vertices: Vector3[];
};

type NavMesh = {
    polygons: Polygon[];
    vertices: Vector3[];
};

type GroupItem = {
    centroid: Vector3;
    id: number,
    neighbours: number[],
    portals: [[number, number], [number, number]],
    vertexIds: number[];
};

/**
 * Defines a group within a navigation mesh.
 */
type Group = GroupItem[];

export type { Node, Polygon, Zone, Group, NavMesh, GroupItem };
