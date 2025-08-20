import { BufferAttribute, BufferGeometry, Vector3 } from 'three';

class Utils {

    public static roundNumber(value: number, decimals: number = 2): number {
        const factor = Math.pow(10, decimals);
        return Math.round(value * factor) / factor;
    }

    public static sample<T>(list: T[]): T {
        return list[Math.floor(Math.random() * list.length)];
    }

    public static distanceToSquared(a: Vector3, b: Vector3) {

        var dx = a.x - b.x;
        var dy = a.y - b.y;
        var dz = a.z - b.z;

        return dx * dx + dy * dy + dz * dz;

    }

    //+ Jonas Raoni Soares Silva
    //@ http://jsfromhell.com/math/is-point-in-poly [rev. #0]
    public static isPointInTriangle(poly: Vector3[], pt: Vector3) {

        const a = poly[0];
        const b = poly[1];
        const c = poly[2];

        const ab = new Vector3(b.x - a.x, b.y - a.y, b.z - a.z);
        const bc = new Vector3(c.x - b.x, c.y - b.y, c.z - b.z);
        const ca = new Vector3(a.x - c.x, a.y - c.y, a.z - c.z);

        const ap = new Vector3(pt.x - a.x, pt.y - a.y, pt.z - a.z);
        const bp = new Vector3(pt.x - b.x, pt.y - b.y, pt.z - b.z);
        const cp = new Vector3(pt.x - c.x, pt.y - c.y, pt.z - c.z);

        const crossAB = ab.cross(ap);
        const crossBC = bc.cross(bp);
        const crossCA = ca.cross(cp);

        if (crossAB.y >= 0 && crossBC.y >= 0 && crossCA.y >= 0) {
            return true; // Point is inside the triangle
        }
        if (crossAB.y <= 0 && crossBC.y <= 0 && crossCA.y <= 0) {
            return true; // Point is inside the triangle
        }
        return false; // Point is outside the triangle

    }

    public static isVectorInPolygon(vector: Vector3, polygon: { vertexIds: number[]; }, vertices: Vector3[]) {

        // reference point will be the centroid of the polygon
        // We need to rotate the vector as well as all the points which the polygon uses

        var lowestPoint = 100000;
        var highestPoint = -100000;

        var polygonVertices = [];

        polygon.vertexIds.forEach((vId) => {
            lowestPoint = Math.min(vertices[vId].y, lowestPoint);
            highestPoint = Math.max(vertices[vId].y, highestPoint);
            polygonVertices.push(vertices[vId]);
        });

        if (vector.y < highestPoint + 0.5 && vector.y > lowestPoint - 0.5 &&
            this.isPointInTriangle(polygonVertices, vector)) {
            return true;
        }

        return false;
    }

    static triarea2(a: Vector3, b: Vector3, c: Vector3) {
        var ax = b.x - a.x;
        var az = b.z - a.z;
        var bx = c.x - a.x;
        var bz = c.z - a.z;
        return bx * az - ax * bz;
    }

    static vequal(a: Vector3, b: Vector3) {
        return this.distanceToSquared(a, b) < 0.00001;
    }

    /**
     * Modified version of BufferGeometryUtils.mergeVertices, ignoring vertex
     * attributes other than position.
     * @param  geometry
     * @param  tolerance
     * @return
     */
    static mergeVertices(geometry: BufferGeometry, tolerance = 1e-4) {

        tolerance = Math.max(tolerance, Number.EPSILON);

        // Generate an index buffer if the geometry doesn't have one, or optimize it
        // if it's already available.

        // 生成索引缓冲区，如果已经存在索引缓冲区，则优化索引缓冲区

        var hashToIndex = {};
        var indices = geometry.getIndex();
        var positions = geometry.getAttribute('position');
        var vertexCount = indices ? indices.count : positions.count;

        // Next value for triangle indices.
        var nextIndex = 0;

        var newIndices = [];
        var newPositions = [];

        // Convert the error tolerance to an amount of decimal places to truncate to.
        var decimalShift = Math.log10(1 / tolerance);
        var shiftMultiplier = Math.pow(10, decimalShift);

        for (var i = 0; i < vertexCount; i++) {

            var index = indices ? indices.getX(i) : i;

            // Generate a hash for the vertex attributes at the current index 'i'.
            var hash = '';

            // Double tilde truncates the decimal value.
            hash += `${~ ~(positions.getX(index) * shiftMultiplier)},`;
            hash += `${~ ~(positions.getY(index) * shiftMultiplier)},`;
            hash += `${~ ~(positions.getZ(index) * shiftMultiplier)},`;

            // Add another reference to the vertex if it's already
            // used by another index.
            if (hash in hashToIndex) {

                newIndices.push(hashToIndex[hash]);

            } else {

                newPositions.push(positions.getX(index));
                newPositions.push(positions.getY(index));
                newPositions.push(positions.getZ(index));

                hashToIndex[hash] = nextIndex;
                newIndices.push(nextIndex);
                nextIndex++;

            }

        }

        // Construct merged BufferGeometry.

        const positionAttribute = new BufferAttribute(
            new Float32Array(newPositions),
            positions.itemSize,
            positions.normalized
        );

        const result = new BufferGeometry();
        result.setAttribute('position', positionAttribute);
        result.setIndex(newIndices);

        return result;

    }

}

export { Utils };
