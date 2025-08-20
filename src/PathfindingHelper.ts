import {
    Vector3,
    BoxGeometry,
    SphereGeometry,
    BufferAttribute,
    BufferGeometry,
    Line,
    LineBasicMaterial,
    Mesh,
    MeshBasicMaterial,
    Object3D,
} from 'three';

import type { GroupItem } from './type';

const colors = {
    PLAYER: 0xEE836F,
    TARGET: 0xDCCB18,
    PATH: 0x00A3AF,
    WAYPOINT: 0x00A3AF,
    CLAMPED_STEP: 0xDCD3B2,
    CLOSEST_NODE: 0x43676B,
    NODE: 0x43676B,
    CHANNEL: 0xff0000,
};

const OFFSET = 0.2;

/**
 * Helper for debugging pathfinding behavior.
 */
class PathfindingHelper extends Mesh {

    private _playerMarker: Mesh;
    private _targetMarker: Mesh;
    private _nodeMarker: Mesh;
    private _stepMarker: Mesh;

    private _nodePathMarkers: Object3D = new Object3D();
    private _channelLines: Object3D = new Object3D();

    private _pathMarker: Object3D;
    private _pathLineMaterial: LineBasicMaterial;
    private _pathPointMaterial: MeshBasicMaterial;
    private _pathPointGeometry: SphereGeometry;

    private _channelMaterial: LineBasicMaterial = new LineBasicMaterial({ color: colors.CHANNEL, linewidth: 2, transparent: true, depthTest: false });

    private _nodeMaterial: MeshBasicMaterial = new MeshBasicMaterial({ color: colors.NODE });

    private _markers: Object3D[];

    constructor() {

        super();

        this.add(this._nodePathMarkers);

        this.add(this._channelLines);

        this._playerMarker = new Mesh(
            new SphereGeometry(0.25, 32, 32),
            new MeshBasicMaterial({ color: colors.PLAYER })
        );

        this._targetMarker = new Mesh(
            new BoxGeometry(0.3, 0.3, 0.3),
            new MeshBasicMaterial({ color: colors.TARGET })
        );


        this._nodeMarker = new Mesh(
            new BoxGeometry(0.1, 0.8, 0.1),
            new MeshBasicMaterial({ color: colors.CLOSEST_NODE })
        );


        this._stepMarker = new Mesh(
            new BoxGeometry(0.1, 1, 0.1),
            new MeshBasicMaterial({ color: colors.CLAMPED_STEP })
        );

        this._pathMarker = new Object3D();

        this._pathLineMaterial = new LineBasicMaterial({ color: colors.PATH, linewidth: 2 });
        this._pathPointMaterial = new MeshBasicMaterial({ color: colors.WAYPOINT });
        this._pathPointGeometry = new SphereGeometry(0.08);

        this._markers = [
            this._playerMarker,
            this._targetMarker,
            this._nodeMarker,
            this._stepMarker,
            this._pathMarker,
        ];

        this._markers.forEach((marker) => {

            marker.visible = false;

            this.add(marker);

        });

    }

    /**
     * @param  path
     */
    setPath(path: Array<Vector3>) {

        while (this._pathMarker.children.length) {

            this._pathMarker.children[0].visible = false;
            this._pathMarker.remove(this._pathMarker.children[0]);

        }

        path.unshift(this._playerMarker.position);

        // Draw debug lines
        const geometry = new BufferGeometry();
        geometry.setAttribute('position', new BufferAttribute(new Float32Array(path.length * 3), 3));
        for (let i = 0; i < path.length; i++) {
            geometry.attributes.position.setXYZ(i, path[i].x, path[i].y + OFFSET, path[i].z);
        }
        this._pathMarker.add(new Line(geometry, this._pathLineMaterial));

        for (let i = 0; i < path.length - 1; i++) {

            const node = new Mesh(this._pathPointGeometry, this._pathPointMaterial);
            node.position.copy(path[i]);
            node.position.y += OFFSET;
            this._pathMarker.add(node);

        }

        this._pathMarker.visible = true;

        return this;

    }

    /**
     * @param  position
     */
    setPlayerPosition(position: Vector3) {

        this._playerMarker.position.copy(position);
        this._playerMarker.visible = true;
        return this;

    }

    /**
     * @param  position
     */
    setTargetPosition(position: Vector3) {

        this._targetMarker.position.copy(position);
        this._targetMarker.visible = true;
        return this;

    }

    /**
     * @param  position
     */
    setNodePosition(position: Vector3) {

        this._nodeMarker.position.copy(position);
        this._nodeMarker.visible = true;
        return this;

    }

    setNodePath(paths: GroupItem[]) {

        this._nodePathMarkers.traverse(c => (c as Mesh).isMesh && (c as Mesh).geometry.dispose());
        this._nodePathMarkers.clear();

        paths.forEach(p => {

            const box = new Mesh(new BoxGeometry(0.3, 0.3, 0.3), this._nodeMaterial);
            box.position.copy(p.centroid);
            this._nodePathMarkers.add(box);

        });

        return this;

    }

    setChannelPath(channels: { left: Vector3; right: Vector3; }[]) {

        this._channelLines.traverse(c => (c as Line).isLine && (c as Line).geometry.dispose());
        this._channelLines.clear();

        channels.forEach(c => {

            const geometry = new BufferGeometry().setFromPoints([c.left, c.right]);
            const line = new Line(geometry, this._channelMaterial);
            line.renderOrder = 999;
            this._channelLines.add(line);

        });

        return this;

    }

    /**
     * @param  position
     */
    setStepPosition(position: Vector3) {

        this._stepMarker.position.copy(position);
        this._stepMarker.visible = true;
        return this;

    }

    /**
     * Hides all markers.
     */
    reset() {

        while (this._pathMarker.children.length) {

            this._pathMarker.children[0].visible = false;
            this._pathMarker.remove(this._pathMarker.children[0]);

        }

        this._markers.forEach((marker) => {

            marker.visible = false;

        });

        return this;

    }

}

export { PathfindingHelper };


