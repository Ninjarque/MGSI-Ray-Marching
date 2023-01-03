#version 140
//430

uniform vec2 fielOfView;

uniform vec3 cameraPosition;

uniform float time;
uniform float moving;

in vec2 screen;
in vec3 dir;
in vec2 coord;

vec3 taskFromPoint[100];
vec3 taskFromDir[100];
int taskDepth[100];
int taskType[100];
int taskResultIndice[100];

vec3 resultColor[100];
float resultRatio[100];
vec3 resultCumulatedColor[100];
int resultParent[100];

const int REFLECTION = 1;
const int REFRACTION = 1;

int results = 0;
int tasksPushed = 0;
int tasksPopped = 0;
int tasksCount = 0;
int tasksMaxCount = 100;
int taskMaxDepth = 2;

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

bool scene(vec3 point, vec3 dir, out float dist, out vec3 color, out vec3 normale,
out float reflectivity, out float opacity, out float roughness)
{
  bool hit = false;
  dist = max_dist;
  float d;
  vec3 n;
  vec3 mblur = movementBlur(point, dir, vec3(0.0, 1.0, 0.0));
  opacity = 1.0;
  if (sphereInfos(point, dir, vec3(0, -2, -5) + mblur, 1.0, d, n) && d < dist)
  {
    dist = d;
    color = vec3(1.0, 0.0, 0.0);
    normale = n;
    hit = true;
    reflectivity = 0.0;
    opacity = 1.0;
    roughness = 0.0;
  }
  if (planeInfos(point, dir, vec3(0.0, 3.0, 0.0), vec3(0, -1, 0), d, n) && d < dist)
  {
    dist = d;
    color = vec3(1.0, 1.0, 1.0)*0.5;
    normale = n;
    hit = true;
    reflectivity = 0.9;
    opacity = 1.0;
    roughness = 0.3;
  }
  if (sphereInfos(point, dir, vec3(-1.5, -0.75, -4.5), 1.0, d, n) && d < dist)
  {
    dist = d;
    color = vec3(0.0, 0.0, 1.0);
    normale = n;
    hit = true;
    reflectivity = 0.8;
    opacity = 1.0;
    roughness = 0.0;
  }
  if (sphereInfos(point, dir, vec3(1.5, -0.5, -4.5), 1.0, d, n) && d < dist)
  {
    dist = d;
    color = vec3(1.0, 0.0, 1.0)*0.3;
    normale = n;
    hit = true;
    reflectivity = 0.0;
    opacity = 0.1;
    roughness = 0.0;
  }
  /*
  if (sphereInfos(point, dir, vec3(-8.5, -5.5, -4.5), 6.0, d, n) && d < dist)
  {
    dist = d;
    color = vec3(0.0, 0.0, 1.0);
    normale = n;
    hit = true;
    reflectivity = 0.0;
    opacity = 1.0;
    roughness = 0.0;
  }
  //*/
  if (planeInfos(point, dir, vec3(-5.0, 0.0, 0.0), vec3(1, 0, 0), d, n) && d < dist)
  {
    dist = d;
    color = vec3(0.95, 0.95, 0.95)*0.7;
    normale = n;
    hit = true;
    reflectivity = 0.9;
    opacity = 1.0;
    roughness = 0.0;
  }
  return hit;
}

bool hitScene(vec3 fromPoint, vec3 fromDir, 
  out vec3 toPoint, out vec3 toReflectionDir, out vec3 toOpacityDir,
  out vec3 toColor, out vec3 toNormal, 
  out float toReflectivity, out float toOpacity, out float toRoughness)
{
  float dist;
  if (scene(fromPoint, fromDir, dist, toColor, toNormal, toReflectivity, toOpacity, toRoughness))
  {
    toPoint = fromPoint + fromDir * dist + toNormal * 0.001;

    vec3 fromDirP = fromDir / dot(fromDir, toNormal);
    float fromDirPL2 = length(fromDirP); fromDirPL2 = fromDirPL2 * fromDirPL2;
    float fromDirPNormalL2 = length(fromDirP + toNormal); fromDirPNormalL2 = fromDirPNormalL2 * fromDirPNormalL2;
    float kn = 1.0;
    float kf = 1 / sqrt(kn * fromDirPL2 - fromDirPNormalL2);

    vec3 reflected_dir = reflect(fromDir, toNormal);
    //fromDirP + 2.0 * toNormal;//reflect(fromDir, toNormal);
    //fromDirP + toNormal;//reflect(fromDir, toNormal);
    vec3 opacity_dir = reflect(fromDir, -toNormal);
          
    vec3 roughnessAxisRe = vec3(
          rand_gaussian(toPoint, time),
          rand_gaussian(toPoint*2.0, -time),
          rand_gaussian(-toPoint, time * 2.0));
    vec3 roughnessAxisOp = vec3(
          rand_gaussian(-toPoint*3.0, -time),
          rand_gaussian(toPoint*-2.0, time),
          rand_gaussian(toPoint, time * 3.0));
    toReflectionDir = normalize(reflected_dir + roughnessAxisRe * toRoughness * toRoughness);
    toOpacityDir = normalize(fromDir + roughnessAxisOp * toRoughness * toRoughness);//normalize(opacity_dir + roughnessAxisOp * toRoughness * toRoughness);
    
    return true;
  }
  return false;
}
vec3 getRealColor(vec3 point, vec3 normal, vec3 reflectionDir, 
  vec3 currentColor, vec3 lightSpecular, out bool done)
{
  vec3 result = currentColor;
  float dist;
  vec3 light_dir = normalize(light_pos - point);
  vec3 opLightColor;
  vec3 opNormal;
  float reflectivity;
  float opacity;
  float roughness;
  float diffuse = 0.0;
  done = false;
  if (!scene(point, light_dir, dist, opLightColor, opNormal, reflectivity, opacity, roughness)
  || dist >= length(light_pos - point))
  {
    float specular = max(0.0, dot(reflectionDir, light_dir));
    specular = pow(specular, 32.0);
    diffuse = max(0.0, dot(normal, light_dir));
    result = currentColor * diffuse + lightSpecular * specular;
  }
  else { result *= 0.0; done = true; }
  return result;
}

void pushTask(vec3 fromPoint, vec3 fromDir, int depth, int type)
{
  if (tasksPushed >= tasksMaxCount || depth > taskMaxDepth)
    return;
  taskFromPoint[tasksPushed] = fromPoint;
  taskFromDir[tasksPushed] = fromDir;
  taskDepth[tasksPushed] = depth;
  taskResultIndice[tasksPopped] = results;
  taskType[tasksPopped] = type;
  tasksPushed++;
  tasksCount++;
}
bool popTask(out vec3 fromPoint, out vec3 fromDir, out int depth, out int type, out int resultIndice)
{
  if (tasksCount == 0)
    return false;
  fromPoint = taskFromPoint[tasksPopped];
  fromDir = taskFromDir[tasksPopped];
  depth = taskDepth[tasksPopped];
  type = taskType[tasksPopped];
  resultIndice = taskResultIndice[tasksPopped];
  tasksPopped++;
  tasksCount--;
  return true;
}

void pushResult(vec3 color, float ratio, int parentColor)
{
  resultColor[results] = color;
  resultRatio[results] = ratio;
  resultCumulatedColor[results] = color;
  resultParent[results] = parentColor;

  results++;
}
vec3 getResult()
{
  int child = results-1;
  int parent = resultParent[child];
  while (child > 0)
  {
    resultCumulatedColor[parent] += resultColor[parent] * resultRatio[parent] * (resultCumulatedColor[child]);
    //child = parent;
    child--;
    parent = resultParent[child];
  }
  return resultCumulatedColor[0];
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

  vec3 toPoint;
  vec3 toReflectionDir;
  vec3 toOpacityDir;
  vec3 toColor;
  vec3 toNormal;
  float toReflectivity;
  float toOpacity;
  float toRoughness;
  float dist;
  bool done;
  vec3 cummulatedColor = backgroundColor;
  if (hitScene(point, direction, toPoint, toReflectionDir, toOpacityDir,
    toColor, toNormal, toReflectivity, toOpacity, toRoughness))
  {
    vec3 realColor = getRealColor(toPoint, toNormal, toReflectionDir, toColor, light_specular, done);
    pushResult(realColor, 1.0, -1);

    if (!done)
    {
      if (toReflectivity > 0.0)
      {
        pushTask(toPoint, toReflectionDir, 0, REFLECTION);
        pushResult(realColor, toReflectivity, 0);
      }
      if (toOpacity < 1.0)
      {
        pushTask(toPoint, toOpacityDir, 0, REFRACTION);
        pushResult(realColor, 1.0 - toOpacity, 0);
      }
    }

    vec3 fromPoint;
    vec3 fromDir;
    int depth;
    int type;
    int resultIndice;

    //Somewhere somehow, there seems to be incorrect data when plane2 is transparent and reflective
    //Need to carrefully check for tasks and results with varying proportions of both
    //Could be a pointer error generated in getResult

    while (popTask(fromPoint, fromDir, depth, type, resultIndice))
    {
      if (hitScene(fromPoint, fromDir, toPoint, toReflectionDir, toOpacityDir,
    toColor, toNormal, toReflectivity, toOpacity, toRoughness))
      {
        vec3 realColor = getRealColor(toPoint, toNormal, toReflectionDir, toColor, light_specular, done);
        if (done)
        {
          pushResult(realColor, 1.0, resultIndice);
          break;
        }
        if (toReflectivity > 0.0)
          pushTask(toPoint, toReflectionDir, depth + 1, REFLECTION);
        if (toOpacity < 1.0)
          pushTask(toPoint, toOpacityDir, depth + 1, REFRACTION);

        if (type == REFLECTION)
          pushResult(realColor, toReflectivity, resultIndice);
        else
          pushResult(realColor, 1.0 - toOpacity, resultIndice);
      }
      else
      {
        pushResult(backgroundColor, 1.0, resultIndice);
      }
    }
    color = getResult();
    /*
    cummulatedColor = toColor;
    vec3 light_dir = normalize(light_pos - toPoint);
    vec3 opLightColor;
    vec3 opNormal;
    float reflectivity;
    float opacity;
    float roughness;
    float diffuse = 0.0;
    if (!scene(toPoint, light_dir, dist, opLightColor, opNormal, reflectivity, opacity, roughness)
    || dist >= length(light_pos - toPoint))
    {
      float specular = max(0.0, dot(toReflectionDir, light_dir));
      specular = pow(specular, 32.0);
      diffuse = max(0.0, dot(toNormal, light_dir));
      cummulatedColor = toColor * diffuse + light_specular * specular;
    }
    if (diffuse == 0.0) cummulatedColor *= diffuse;
    */
  }
  //color = getResult();//cummulatedColor;

  /*
  float dist;
  vec3 c;
  vec3 n;  
  float re;
  float op;
  float ro;
  float originalReflectivity = 1.0;
  vec3 originalColor;
  if (scene(point, direction, dist, c, n, re, op, ro))
  {
    originalColor = c;
    originalReflectivity = re;
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
      float rec;
      float opc;
      float roc;
      vec3 ambientC;
      vec3 ambientN;
      float ambientReflectivity;
      float ambientOpacity;
      float ambientRoughness;

      vec3 reflected_dir = reflect(direction, n);
          vec3 roughnessAxis = vec3(
          rand_gaussian(hit_point, time),
          rand_gaussian(hit_point*2.0, -time),
          rand_gaussian(-hit_point, time * 2.0));
      reflected_dir = normalize(reflected_dir + roughnessAxis * ro * ro);
      specular = max(0.0, dot(reflected_dir, light_dir));
      if (!scene(hit_point, light_dir, dist, lc, nc, rec, opc, roc) 
        || dist >= length(light_pos - hit_point) || opc < 1.0)
      {
        diffuse = max(0.0, dot(n, light_dir));
        specular = pow(specular, 32.0);
        if (opc < 1.0)
        {
          diffuse *= 1.0 - opc;
          specular *= 1.0 - opc;
        }

        vec3 ambient_point = hit_point;
        if (scene(ambient_point, reflected_dir, dist, ambientC, ambientN, 
          ambientReflectivity, ambientOpacity, ambientRoughness))
        {
          reflectivity = 1.0;
          n = ambientN;
          point = ambient_point;
          direction = reflected_dir;
          ro = ambientRoughness;
        }
      }
      if (diffuse == 0.0)
      {
        cummulatedColor *= diffuse;
        originalColor = cummulatedColor;
        break;
      }

      //problems with refrectivity, when reflectivity < 1 but > 0 undefined behaviour
      // == 1, delete re and reflecitivity stuff and it works
      // == 0, well just don't loop and, kinda seems to work with re still here

      steps++;
      vec3 stepColor = currentC * diffuse * 1.0 + specular * light_specular * 1.0;
      cummulatedColor = (cummulatedColor * stepColor); // sqrt(i + 1.0);
      if (step == 0.0)
        originalColor = cummulatedColor;
      if (reflectivity * re == 0.0)
        break;
      currentC *= ambientC;// * re;
      c = ambientC;
      re = ambientReflectivity;
    }
    color = cummulatedColor;
  }
  */

  finalColor = vec4(color + ambientColor, 1.);
}
