export const DEVICE_SCENE_ROTATION_Y_RAD = Math.PI;
export const COORDINATE_SYSTEM_NOTE = "CSV X/Y/Z = 3D视角 X/Y/Z，默认3D视角 X+向左上、Y+向右上，Z为高度，单位 mm";

export function deviceToSceneVectorData(point, scale = 1) {
  return {
    x: Number(point.x || 0) * scale,
    y: Number(point.z || 0) * scale,
    z: Number(point.y || 0) * scale,
  };
}

export function sceneToDevicePointData(vector, scale = 1) {
  return {
    x: Number(vector.x || 0) / scale,
    y: Number(vector.z || 0) / scale,
    z: Number(vector.y || 0) / scale,
  };
}
