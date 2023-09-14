export const vertexShaderSource = `
precision mediump float;

attribute vec3 position;

attribute vec4 color;
attribute vec4 quat;
attribute vec3 scale;
attribute vec3 center;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform vec2 focal;
uniform vec2 viewport;

varying vec4 vColor;
varying vec3 vConic;
varying vec2 vCenter;
varying vec2 vPosition;

mat3 transpose(mat3 m) { return mat3(m[0][0], m[1][0], m[2][0], m[0][1], m[1][1], m[2][1], m[0][2], m[1][2], m[2][2]); }

mat3 compute_cov3d(vec3 scale, vec4 rot) {
    mat3 S = mat3(
        scale.x, 0.0, 0.0,
        0.0, scale.y, 0.0,
        0.0, 0.0, scale.z
    );
    mat3 R = mat3(
        1.0 - 2.0 * (rot.z * rot.z + rot.w * rot.w), 2.0 * (rot.y * rot.z - rot.x * rot.w), 2.0 * (rot.y * rot.w + rot.x * rot.z),
        2.0 * (rot.y * rot.z + rot.x * rot.w), 1.0 - 2.0 * (rot.y * rot.y + rot.w * rot.w), 2.0 * (rot.z * rot.w - rot.x * rot.y),
        2.0 * (rot.y * rot.w - rot.x * rot.z), 2.0 * (rot.z * rot.w + rot.x * rot.y), 1.0 - 2.0 * (rot.y * rot.y + rot.z * rot.z)
    );
    mat3 M = S * R;
    return transpose(M) * M;
}

vec3 compute_cov2d(vec3 center, vec3 scale, vec4 rot){
    mat3 Vrk = compute_cov3d(scale, rot);
    vec4 t = modelViewMatrix * vec4(center, 1.0);
    vec2 lims = 1.3 * 0.5 * viewport / focal;
    t.xy = min(lims, max(-lims, t.xy / t.z)) * t.z;
    mat3 J = mat3(
        focal.x / t.z, 0., -(focal.x * t.x) / (t.z * t.z), 
        0., focal.y / t.z, -(focal.y * t.y) / (t.z * t.z), 
        0., 0., 0.
    );
    mat3 W = transpose(mat3(modelViewMatrix));
    mat3 T = W * J;
    mat3 cov = transpose(T) * transpose(Vrk) * T;
    return vec3(cov[0][0] + 0.3, cov[0][1], cov[1][1] + 0.3);
}

void main () {
    vec4 camspace = modelViewMatrix * vec4(center, 1);
    
    vec4 pos2d = projectionMatrix  * camspace;

    vec3 cov2d = compute_cov2d(center, scale, quat);
    float det = cov2d.x * cov2d.z - cov2d.y * cov2d.y;
    vec3 conic = vec3(cov2d.z, cov2d.y, cov2d.x) / det;
    float mid = 0.5 * (cov2d.x + cov2d.z);
    float lambda1 = mid + sqrt(max(0.1, mid * mid - det));
    float lambda2 = mid - sqrt(max(0.1, mid * mid - det));
    vec2 v1 = 7.0 * sqrt(lambda1) * normalize(vec2(cov2d.y, lambda1 - cov2d.x));
    vec2 v2 = 7.0 * sqrt(lambda2) * normalize(vec2(-(lambda1 - cov2d.x),cov2d.y));

    vColor = color;
    vConic = conic;
    vCenter = vec2(pos2d) / pos2d.w;

    vPosition = vec2(vCenter + position.x * (position.y < 0.0 ? v1 : v2) / viewport);
    gl_Position = vec4(vPosition, pos2d.z / pos2d.w, 1);
}
`;

export const fragmentShaderSource = `
precision mediump float;

varying vec4 vColor;
varying vec3 vConic;
varying vec2 vCenter;

uniform vec2 viewport;
uniform vec2 focal;

void main () {    
	vec2 d = (vCenter - 2.0 * (gl_FragCoord.xy/viewport - vec2(0.5, 0.5))) * viewport * 0.5;
    
	float power = -0.5 * (vConic.x * d.x * d.x + vConic.z * d.y * d.y) + vConic.y * d.x * d.y;

	if (power > 0.0) discard;
	float alpha = min(0.99, vColor.a * exp(power));
	if(alpha < 0.02) discard;

    gl_FragColor = vec4(vColor.rgb, alpha);
}
`;
