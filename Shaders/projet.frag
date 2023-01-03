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
float max_light_dist = 100.0f;
float epsilon = 0.001;
float light_epsilon = 0.01;

float focalDist = 5.0;
float aperture = 0.05;

vec3 lightPos = vec3(2.0, -3.0, -2.0);
vec3 backgroundColor = vec3(0.4,0.5,1.0);
vec3 ambientColor = vec3(0.1,0.2,0.4);

uniform mat4 objectMatrices[100];
uniform int objectTypes[100];
uniform float objectDatas[100];
uniform int csg_type[100];
uniform float csg_data[100];
uniform int csg_number;

uniform vec3 color[100];
uniform float diffuse[100];
uniform float specular[100];
uniform float reflection[100];
uniform float roughness[100];

float rand(float co) { return fract(sin(co*(91.3458)) * 47453.5453); }
float rand(vec2 co){ return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }
float rand(vec3 co){ return rand(co.xy+rand(co.z)); }
float rand(vec3 co, float time){ return rand(co.xy+rand(co.z*time)); }
float rand_gaussian(vec3 seed, float time)
{
  float u1 = max(rand(seed, time), 0.00001);
  float u2 = rand(seed + vec3(1.0,-1.0,5.358), time*fract(time));
  //return (u1 * 2.0 - 1.0 + u2 * 2.0 - 1.0) / 2.0;
  return sqrt(-2.0 * log(u1)) * cos(2.0 * 3.14159 * u2);
}

vec3 movementBlur(vec3 point, vec3 dir, vec3 movement)
{
  float rnd = (rand_gaussian(dir, time) / 2.0 + 0.5);
  return rnd * movement;
}


// specular
float computeSpecular(vec3 normal,vec3 point, vec3 camPos,vec3 light_pos){
	    vec3 light_dir =  light_pos - point;
        light_dir = normalize(light_dir);
        vec3 eyeDirection = normalize(camPos - point);
        vec3 reflectedLight = reflect(-light_dir, normal);
        float spec = max(0., dot(reflectedLight, eyeDirection));
        spec = pow(spec, 15.);
      return spec;
}
//diffuse 
float  computeDiffuse(vec3 normal,vec3 point, vec3 light_pos){ 
	  vec3 light_dir =  light_pos - point;
      light_dir = normalize(light_dir);
      float dif = max(0.,dot(normal, light_dir)); 
      return dif;
}

float sphere(vec3 point, vec3 position, float radius)
{
  return distance(point, position) -radius;
}
float cube(vec3 point, vec3 position, vec3 bounds)
{
  vec3 q = abs(point - position) - bounds;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}
float plane(vec3 p, vec3 n, vec3 planePoint)
{
  // n must be normalized
  float h = -dot(planePoint, n);
  return dot(p,normalize(n)) + h;
}
float mandelbulb(vec3 point, vec3 position, float radius)
{
  point -= position;
  vec3 z = point;
  float dr = 1.0;
  float r;
  float power = 3.0;

  for (int i = 0; i < 15; i++)
  {
    r = length(z);
    if (r > 2)
      break;
    
    float theta = acos(z.z / r) * power;
    float phi = atan(z.y, z.x) * power;
    float zr = pow(r, power);
    
    dr = pow(r, power - 1) * power * dr + 1;

    z = zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta));
    z += point;
  }
  return 0.5 * log(r) * r / dr / radius;
}
float torus( vec3 p, vec3 position, vec2 t)
{
  p -= position;
  vec2 q = vec2(length(p.xz)-t.x,p.y);
  return length(q)-t.y;
}

void sphereInfos(vec3 point, vec3 position, float radius, out float dist, out vec3 normale)
{
  dist = sphere(point, position, radius);
  float dx = sphere(point + vec3(epsilon, 0.0, 0.0), position, radius) - dist;
  float dy = sphere(point + vec3(0.0, epsilon, 0.0), position, radius) - dist;
  float dz = sphere(point + vec3(0.0, 0.0, epsilon), position, radius) - dist;
  normale = vec3(dx, dy, dz) / epsilon;
}
void cubeInfos(vec3 point, vec3 position, vec3 bounds, out float dist, out vec3 normale)
{
  dist = cube(point, position, bounds);
  float dx = cube(point + vec3(epsilon, 0.0, 0.0), position, bounds) - dist;
  float dy = cube(point + vec3(0.0, epsilon, 0.0), position, bounds) - dist;
  float dz = cube(point + vec3(0.0, 0.0, epsilon), position, bounds) - dist;
  normale = vec3(dx, dy, dz) / epsilon;
}
void planeInfos(vec3 point, vec3 n, vec3 planePoint, out float dist, out vec3 normale)
{
  dist = plane(point, n, planePoint);
  normale = n;
}
void mandelbulbInfos(vec3 point, vec3 position, float radius, out float dist, out vec3 normale)
{
  dist = mandelbulb(point, position, radius);
  float dx = mandelbulb(point + vec3(epsilon, 0.0, 0.0), position, radius) - dist;
  float dy = mandelbulb(point + vec3(0.0, epsilon, 0.0), position, radius) - dist;
  float dz = mandelbulb(point + vec3(0.0, 0.0, epsilon), position, radius) - dist;
  normale = vec3(dx, dy, dz) / epsilon;
}
void torusInfos(vec3 point, vec3 position, vec2 t, out float dist, out vec3 normale)
{
  dist = torus(point, position, t);
  float dx = torus(point + vec3(epsilon, 0.0, 0.0), position, t) - dist;
  float dy = torus(point + vec3(0.0, epsilon, 0.0), position, t) - dist;
  float dz = torus(point + vec3(0.0, 0.0, epsilon), position, t) - dist;
  normale = vec3(dx, dy, dz) / epsilon;
}

void scene(vec3 point, vec3 dir, out float dist, out vec3 color, out vec3 normale)
{
  dist = max_dist;
  float d;
  vec3 n;
  vec3 mblur = movementBlur(point, dir, vec3(0.0, 1.0, 0.0));
  sphereInfos(point, vec3(0, -2, -5) + mblur, 1.0, d, n);
  if (d < dist)
  {
    dist = d;
    color = vec3(1.0, 0.0, 0.0);
    normale = n;
  }
  planeInfos(point, vec3(0, -1, 0), vec3(0.0, 3.0, 0.0), d, n);
  if (d < dist)
  {
    dist = d;
    color = vec3(1.0, 1.0, 1.0);
    normale = n;
  }
  sphereInfos(point, vec3(-1.5, -0.75, -4.5), 1.0, d, n);
  if (d < dist)
  {
    dist = d;
    color = vec3(0.0, 0.0, 1.0);
    normale = n;
  }
  // /*
  cubeInfos(point, vec3(2, 0, -5), vec3(1.0, 2.0, 1.0), d, n);
  if (d < dist)
  {
    dist = d;
    color = vec3(1.0, 1.0, 1.0);
    normale = n;
  }
  // */
  torusInfos(point, vec3(-2.5, 1, -4), vec2(1.5, 0.75), d, n);
  if (d < dist)
  {
    dist = d;
    color = vec3(1.0, 0.0, 1.0);
    normale = n;
  }
}

void main() {
  vec3 origin = -cameraPosition;

  vec3 color = backgroundColor;//vec3(0.0f, 0.0f, 0.0f);

  float min_dist = max_dist;
  vec3 point = origin;
  vec3 direction = dir;

  bool hit = false;

  //ici profondeur de champ, a savoir créer un focalPoint a partir de la direction initiale et de la focalDist
  //déplacer le point origine de manière aléatoire puis déterminer une nouvelle direction entre l'origine et le focalPoint
  vec3 FocalPoint = direction * focalDist + point;
  vec3 offsetpoint = vec3(
    rand_gaussian(dir,time),
    rand_gaussian(point*2.0+dir*2.0,-time*5.0),
    rand_gaussian(dir*3.0+point,time*2.0));
  point += offsetpoint * aperture;
  direction = normalize(FocalPoint - point);
  
  if (moving > 0.0)
  {
    epsilon = 0.05;
    light_epsilon = 0.1;
    max_dist = 10.0;
    max_light_dist = 5.0;
  }

  for (float step = epsilon; step < max_dist;)
  {
    float d;
    vec3 c;
    vec3 n;
    scene(point, direction, d, c, n);
    if (d <= epsilon)
    {
      vec3 light_dir = normalize(lightPos - point); //reflect(direction, n);
      vec3 p = point + n * light_epsilon * 1.01;
      vec3 startP = p;
      float light_dist = max_dist;
      vec3 lc;
      vec3 ln;
      float light_step = 0.0;
      float light_power = 1.0;
      bool stopped = false;
      float plight_dist = 1e20;
      float k = 128.0;
      for (light_step = light_epsilon; light_step <= max_light_dist;)
      {
        scene(p, light_dir, light_dist, lc, ln);
        if (light_dist <= light_epsilon)
        {
          stopped = true;
          light_power = 0.0;
          break;
        }
        //light_power = min(light_power, k * light_dist / light_step);
        float y = light_dist*light_dist/(2.0*plight_dist);
        float d = sqrt(light_dist*light_dist-y*y);
        light_power = min(light_power, k*d/max(0.0,light_step-y));
        p += light_dist * light_dir;
        light_step += light_dist;
        plight_dist = light_dist;
      }
      float light = light_power; //min(1.0, light + light_step / (max_light_dist)*1.0);
      light = pow(light, 1.0);
      float AO = 1.0 - pow(step / (max_dist), 4.0);
      color = c * AO * light * (computeDiffuse(n, startP, lightPos) + computeSpecular(n, p, point, lightPos)); //+ (1.0 - light) * ambientColor;
      hit = true;
      break;
    }
    point += d * direction;
    step += d;
  }
  /*if (!hit)
  {
    discard;
    return;
  }*/

  //color = vec3(abs(dir.x), abs(dir.y), abs(dir.z));
  finalColor = vec4(color + ambientColor, 1.);
}
