//#version 430
#version 140
//430

uniform vec2 fielOfView;

uniform vec3 cameraPosition;

uniform float focalDist;

uniform float time;

in vec2 screen;
in vec3 dir;
in vec2 coord;


out vec4 finalColor;

float max_steps = 30;
float max_light_steps = 20;
float epsilon = 0.0003;
float max_dist = 10000.0;

vec3 lightPos = vec3(2.0, -3.0, -2.0);

float sphere(vec3 point, vec3 position, float radius)
{
  return distance(point, position) -radius;
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
  return 0.5 * log(r) * r / dr * radius;
}

void sphereInfos(vec3 point, vec3 position, float radius, out float dist, out vec3 normale)
{
  dist = sphere(point, position, radius);
  float dx = sphere(point + vec3(epsilon, 0.0, 0.0), position, radius) - dist;
  float dy = sphere(point + vec3(0.0, epsilon, 0.0), position, radius) - dist;
  float dz = sphere(point + vec3(0.0, 0.0, epsilon), position, radius) - dist;
  normale = vec3(dx, dy, dz) / epsilon;
}
void mandelbulbInfos(vec3 point, vec3 position, float radius, out float dist, out vec3 normale)
{
  dist = mandelbulb(point, position, radius);
  float dx = mandelbulb(point + vec3(epsilon, 0.0, 0.0), position, radius) - dist;
  float dy = mandelbulb(point + vec3(0.0, epsilon, 0.0), position, radius) - dist;
  float dz = mandelbulb(point + vec3(0.0, 0.0, epsilon), position, radius) - dist;
  normale = vec3(dx, dy, dz) / epsilon;
}

void scene(vec3 point, out float dist, out vec3 color, out vec3 normale)
{
  dist = max_dist;
  float d;
  vec3 n;
  // /*
  sphereInfos(point, vec3(0, 0, -5), 1.0, d, n);
  if (d < dist)
  {
    dist = d;
    color = vec3(1.0, 0.0, 0.0);
    normale = n;
  }
  sphereInfos(point, vec3(2, 0, -5), 1.0, d, n);
  if (d < dist)
  {
    dist = d;
    color = vec3(0.0, 1.0, 0.0);
    normale = n;
  }
  sphereInfos(point, vec3(-2, 0, -5), 1.0, d, n);
  if (d < dist)
  {
    dist = d;
    color = vec3(0.0, 0.5, 1.0);
    normale = n;
  }
  //*/
  /*
  mandelbulbInfos(point, vec3(0, 0, -5), 1.0, d, n);
  if (d < dist)
  {
    dist = d;
    color = vec3(1.0, 0.0, 1.0);
    normale = n;
  }
  */
}




float rand(float co) { return fract(sin(co*(91.3458)) * 47453.5453); }
float rand(vec2 co){ return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }
float rand(vec3 co){ return rand(co.xy+rand(co.z)); }
float rand(vec3 co, float time){ return rand(co.xy+rand(co.z*time)); }

uniform float moving;

void main() {
  vec3 origin = -cameraPosition;

  vec3 color = vec3(0.0f, 0.0f, 0.0f);

  float min_dist = max_dist;
  vec3 point = origin;
  //ici profondeur de champ, a savoir créer un focalPoint a partir de la direction initiale et de la focalDist
  //déplacer le point origine de manière aléatoire puis déterminer une nouvelle direction entre l'origine et le focalPoint
  vec3 FocalPoint = dir * 5 + point;
  vec3 offsetpoint = vec3((rand(dir,time)-0.5)*2.0,(rand(dir+dir,time)-0.5)*2.0,(rand(dir+dir*2,time)-0.5)*2.0);
  point += offsetpoint * 0.2;
  vec3 focaldir = normalize(FocalPoint - point);


  if (moving > 0.0)
  {
    epsilon *= 50.0;
    max_steps /= 3.0;
    max_light_steps /= 5.0;
  }

  for (float step = 0; step < max_steps; step += 1.0)
  {
    float d;
    vec3 c;
    vec3 n;
    scene(point, d, c, n);
    if (d <= epsilon)
    {
      vec3 light_dir = normalize(lightPos - point); //reflect(dir, n);
      vec3 p = point + n * epsilon;
      float light_dist = max_dist;
      vec3 lc;
      vec3 ln;
      float light_step = 0;
      for (light_step = 0; light_step <= max_light_steps; light_step += 1.0)
      {
        scene(p, light_dist, lc, ln);
        if (light_dist <= epsilon)
        {
          break;
        }
        p += light_dist * light_dir;
      }
      float light = light_step / max_light_steps;
      color = c * pow(1.0 - step / max_steps, 0.8) * pow(light, 3.0);
      break;
    }
    point += d * focaldir ;
  }

  
  //color = vec3(abs(dir.x), abs(dir.y), abs(dir.z));
  finalColor = vec4(color, 1.);
}
