#version 140
//430

uniform vec2 fielOfView;

uniform vec3 cameraPosition;

uniform float time;
uniform float moving;

in vec2 screen;
in vec3 dir;
in vec2 coord;

out vec4 finalColor;

float max_dist = 100.0f;
float reccursions = 3.0f;

float focalDist = 7.0;
float aperture = 0.04;

vec3 light_pos = vec3(-1.0, -7.0, -2.0);
vec3 backgroundColor = vec3(0.4,0.5,1.0);
vec3 ambientColor = vec3(0.1,0.2,0.4);

float rand(float co) { return fract(sin(co*(91.3458)) * 47453.5453); }
float rand(vec2 co){ return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }
float rand(vec3 co){ return rand(co.xy+rand(co.z)); }
float rand(vec3 co, float time){ return rand(co.xy+rand(co.z*time)); }
float rand_gaussian(vec3 seed, float time)
{
  float u1 = rand(seed);
  float u2 = rand(seed + vec3(1.0,-1.0,5.358), time);
  //return (u1 * 2.0 - 1.0 + u2 * 2.0 - 1.0) / 2.0;
  return sqrt(-2.0 * log(u1)) * cos(2.0 * 3.14159 * u2);
  //return pow(u1, 0.25) * 2.0 - 1.0;
}

mat4 rotationMatrix(vec3 axis, float angle)
{
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;
    
    return mat4(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
                oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
                oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
                0.0,                                0.0,                                0.0,                                1.0);
}

vec3 movementBlur(vec3 point, vec3 dir, vec3 movement)
{
  float rnd = (rand_gaussian(dir, time) / 2.0 + 0.5);
  return rnd * movement;
}

bool sphereInfos(vec3 point, vec3 dir, vec3 position, float radius, out float dist, out vec3 normale)
{
  bool  r = false;
  vec3  d = point - position;
  float b = dot(dir,d);
  float c = dot(d,d) - radius*radius;
  dist = b*b-c;
  if( dist > 0.0 )
  {
    dist = -b-sqrt(dist);
    r = dist > 0.0 && dist < max_dist;
    normale = normalize(point + dist * dir - position);
  }

  return r;
}
bool planeInfos(vec3 point, vec3 dir, vec3 position, vec3 normale, out float dist, out vec3 n)
{
  n = normalize(normale);
  float h = -dot(position, n);
  dist = -(dot(n,point)+h)/dot(n,dir);
  return (dist > 0.0) && (dist < max_dist);
}

bool scene(vec3 point, vec3 dir, out float dist, out vec3 color, out vec3 normale, out float roughness)
{
  bool hit = false;
  dist = max_dist;
  float d;
  vec3 n;
  vec3 mblur = movementBlur(point, dir, vec3(0.0, 1.0, 0.0));
  if (sphereInfos(point, dir, vec3(0, -2, -5) + mblur, 1.0, d, n) && d < dist)
  {
    dist = d;
    color = vec3(1.0, 0.0, 0.0);
    normale = n;
    hit = true;
    roughness = 0.0;
  }
  if (planeInfos(point, dir, vec3(0.0, 3.0, 0.0), vec3(0, -1, 0), d, n) && d < dist)
  {
    dist = d;
    color = vec3(1.0, 1.0, 1.0);
    normale = n;
    hit = true;
    roughness = 0.0;
  }
  if (sphereInfos(point, dir, vec3(-1.5, -0.75, -4.5), 1.0, d, n) && d < dist)
  {
    dist = d;
    color = vec3(0.0, 0.0, 1.0);
    normale = n;
    hit = true;
    roughness = 0.0;
  }
  if (sphereInfos(point, dir, vec3(1.5, -0.5, -4.5), 1.0, d, n) && d < dist)
  {
    dist = d;
    color = vec3(1.0, 0.0, 1.0);
    normale = n;
    hit = true;
    roughness = 0.0;
  }
  ///*
  if (sphereInfos(point, dir, vec3(-8.5, -5.5, -4.5), 6.0, d, n) && d < dist)
  {
    dist = d;
    color = vec3(0.0, 0.0, 1.0);
    normale = n;
    hit = true;
    roughness = 0.0;
  }
  //*/
  if (planeInfos(point, dir, vec3(-5.0, 0.0, 0.0), vec3(1, 0, 0), d, n) && d < dist)
  {
    dist = d;
    color = vec3(0.95, 0.95, 0.95);
    normale = n;
    hit = true;
    roughness = 0.3;
  }
  return hit;
}

void main() {
  vec3 origin = -cameraPosition;

  vec3 color = backgroundColor;//vec3(0.0f, 0.0f, 0.0f);

  float min_dist = max_dist;
  vec3 point = origin;
  vec3 direction = dir;

  bool hit = false;

  vec3 focalPoint = direction * focalDist + point;
  vec3 offsetpoint = vec3(
    rand_gaussian(vec3(coord.x*2.0, coord.y*2.0, time*1.0), time*2.0),
    rand_gaussian(vec3(coord.x*1.0, -coord.y*5.0, time*8.0), -time),
    rand_gaussian(vec3(-coord.x*3.0, coord.y*1.0, time*3.0), time*8.0));
  point += offsetpoint * aperture;
  direction = normalize(focalPoint - point);
  
  if (moving > 0.0)
  {
    max_dist *= 0.75;
  }

  vec3 light_specular = vec3(1.3, 1.3, 1.3);

  float dist;
  vec3 c;
  vec3 n;  
  float r;
  if (scene(point, direction, dist, c, n, r))
  {
    vec3 cummulatedColor = vec3(1.0, 1.0, 1.0);
    float steps = 0.0;
    vec3 currentC = c;
    for (float step = 0.0; step < reccursions + 1; step++)
    {
      float diffuse = 0.0;
      float specular = 0.0;
      float reflectivity = 0.0;
      vec3 hit_point = point + dist * direction + n * 0.001;
      vec3 light_dir = normalize(light_pos - hit_point);
      vec3 lc;
      vec3 nc;
      float rc;
      vec3 ambientC;
      vec3 ambientN;
      float ambientRoughness;

      vec3 reflected_dir = reflect(direction, n);
          vec3 roughnessAxis = vec3(
          rand_gaussian(hit_point, time),
          rand_gaussian(hit_point*2.0, -time),
          rand_gaussian(-hit_point, time * 2.0));
      reflected_dir = normalize(reflected_dir + roughnessAxis * r * r);
      specular = max(0.0, dot(reflected_dir, light_dir));
      if (!scene(hit_point, light_dir, dist, lc, nc, rc) || dist >= length(light_pos - hit_point))
      {
        diffuse = max(0.0, dot(n, light_dir));
        specular = pow(specular, 32.0);

        vec3 ambient_point = hit_point;
        if (scene(ambient_point, reflected_dir, dist, ambientC, ambientN, ambientRoughness))
        {
          reflectivity = 1.0;
          n = ambientN;
          point = ambient_point;
          /*
          vec3 roughnessAxis = vec3(
          rand_gaussian(ambient_point, time),
          rand_gaussian(ambient_point*2.0, -time),
          rand_gaussian(-ambient_point, time * 2.0));
          //mat4 r = rotationMatrix(roughnessAxis, rand(time));
          direction = normalize(reflected_dir + roughnessAxis * r);
          */
          direction = reflected_dir;
          r = ambientRoughness;
        }
      }
      if (diffuse == 0.0f)
      {
        cummulatedColor *= diffuse;
        break;
      }

      steps++;
      vec3 stepColor = currentC * diffuse * 1.0 + specular * light_specular * 1.0 + currentC * ambientC * reflectivity * 0.0;
      cummulatedColor *= stepColor; // sqrt(i + 1.0);
      if (reflectivity == 0.0)
        break;
      currentC *= ambientC;
      c = ambientC;
    }
    color = cummulatedColor;
  }

  finalColor = vec4(color + ambientColor, 1.);
}
