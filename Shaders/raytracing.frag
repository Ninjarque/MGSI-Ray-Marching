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
const int REFRACTION = 2;

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

const int maxObjects = 100;
const int maxCSGs = 100;

uniform mat4 objectMatrices[maxObjects];
uniform mat4 objectMatricesInverse[maxObjects];
uniform int objectTypes[maxObjects];
uniform float objectDatas[maxObjects];
uniform int objectNumber;

uniform int csg_type[maxCSGs];
uniform float csg_data[maxCSGs];
uniform int csg_objectDatasIndices[maxCSGs];
uniform int csg_number;

uniform float material[maxObjects];
uniform int materialSize;
//uniform vec3 color[maxObjects];
//uniform float diffuse[maxObjects];
//uniform float specular[maxObjects];
//uniform float reflection[maxObjects];
//uniform float roughness[maxObjects];

const int CSG_TYPE_OBJ = 10;
const int CSG_TYPE_UNION = 1;
const int CSG_TYPE_DIFFERENCE = 2;
const int CSG_TYPE_INTERSECTION = 3;

const int OBJ_TYPE_SPHERE = 1;
const int OBJ_TYPE_CUBE = 2;
const int OBJ_TYPE_PLANE = 3;
const int OBJ_TYPE_TORUS = 4;

float objectStack[maxObjects * 12];
int objectStackIndice = 0;
void pushObject(in float dist, in vec3 normal, in vec4 color, 
  in float diffuse, in float specular, in float reflection, in bool hasHit)
{
  objectStack[objectStackIndice++] = dist;
  objectStack[objectStackIndice++] = normal.x;
  objectStack[objectStackIndice++] = normal.y;
  objectStack[objectStackIndice++] = normal.z;
  objectStack[objectStackIndice++] = color.x;
  objectStack[objectStackIndice++] = color.y;
  objectStack[objectStackIndice++] = color.z;
  objectStack[objectStackIndice++] = color.w;
  objectStack[objectStackIndice++] = diffuse;
  objectStack[objectStackIndice++] = specular;
  objectStack[objectStackIndice++] = reflection;
  if (hasHit)
    objectStack[objectStackIndice++] = 1.0f;
  else
    objectStack[objectStackIndice++] = 0.0f;
}
void popObject(out float dist, out vec3 normal, out vec4 color, 
  out float diffuse, out float specular, out float reflection, out bool hasHit)
{
  normal = vec3(0.0, 0.0, 0.0);
  color = vec4(0.0, 0.0, 0.0, 0.0);
  float hit = 0.0;
  hit = objectStack[--objectStackIndice];
  hasHit = hit == 1.0;
  reflection = objectStack[--objectStackIndice];
  specular = objectStack[--objectStackIndice];
  diffuse = objectStack[--objectStackIndice];
  color.w = objectStack[--objectStackIndice];
  color.z = objectStack[--objectStackIndice];
  color.y = objectStack[--objectStackIndice];
  color.x = objectStack[--objectStackIndice];
  normal.z = objectStack[--objectStackIndice];
  normal.y = objectStack[--objectStackIndice];
  normal.x = objectStack[--objectStackIndice];
  dist = objectStack[--objectStackIndice];
}

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
vec3 rand_dir(vec3 seed, float time)
{
  return vec3(
          rand_gaussian(-seed*3.0, -time),
          rand_gaussian(seed*-2.0, time),
          rand_gaussian(seed, time * 3.0));
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
bool sphereInfos(vec3 point, vec3 dir, float radius, out float dist, out vec3 normale)
{
  return sphereInfos(point, dir, vec3(0.0, 0.0, 0.0), radius, dist, normale);
}
bool cubeInfos(vec3 origin, vec3 dir, vec3 bounds, out float dist, out vec3 normal) {
  // Calculate the intersection of the ray with the AABB
  vec3 invDir = 1.0 / dir;
  vec3 tmin = (bounds - origin) * invDir;
  vec3 tmax = (-bounds - origin) * invDir;
  vec3 t1 = min(tmin, tmax);
  vec3 t2 = max(tmin, tmax);
  float tnear = max(max(t1.x, t1.y), t1.z);
  float tfar = min(min(t2.x, t2.y), t2.z);

  // Check if the ray intersects the AABB
  if (tnear > tfar || tfar < 0.0) {
    return false;
  }

  // Calculate the intersection distance and normal
  dist = tnear;
  vec3 p = origin + dir * dist;
  float stepM = max(max(p.x, p.y), p.z);
  float stepm = min(min(p.x, p.y), p.z);
  if (stepM > -stepm)
    normal = step(stepM, p);
  else
    normal = -step(-stepm, -p);
  return true;
}

bool planeInfos(vec3 point, vec3 dir, vec3 position, vec3 normale, out float dist, out vec3 n)
{
  n = normalize(normale);
  float h = -dot(position, n);
  dist = -(dot(n,point)+h)/dot(n,dir);
  return (dist > 0.0) && (dist < max_dist);
}
bool planeInfos(vec3 point, vec3 dir, vec3 normale, out float dist, out vec3 n)
{
  return planeInfos(point, dir, vec3(0.0, 0.0, 0.0), normale, dist, n);
}
bool torusInfos(vec3 origin, vec3 dir, float bigRadius, float smallRadius, out float dist, out vec3 normal) {
  // Calculate the intersection of the ray with the torus
  float a = dot(dir, dir);
  float b = 2.0 * dot(dir, origin);
  float c = dot(origin, origin) + bigRadius * bigRadius - smallRadius * smallRadius;
  float discriminant = b * b - 4.0 * a * c;

  // Check if the ray intersects the torus
  if (discriminant < 0.0) {
    return false;
  }

  // Calculate the roots of the equation
  float t1 = (-b - sqrt(discriminant)) / (2.0 * a);
  float t2 = (-b + sqrt(discriminant)) / (2.0 * a);
  
  // Check which root is valid (i.e. positive and smaller than the distance to the closest intersection point found so far)
  if (t1 > 0.0) {
    dist = t1;
  }
  if (t2 > 0.0 && t2 < dist) {
    dist = t2;
  }

  // Calculate the position of the intersection point
  vec3 point = origin + dist * dir;

  // Calculate the point on the central axis of the torus closest to the intersection point
  vec2 pointOnAxis = vec2(bigRadius * cos(atan(point.y, point.x)), bigRadius * sin(atan(point.y, point.x)));

  // Calculate the normal as the difference between the intersection point and the point on the central axis
  normal = point - vec3(pointOnAxis, 0.0);

  // Normalize the normal vector
  normal = normalize(normal);

  return true;
}

bool scene(vec3 point, vec3 dir, out float dist, out vec3 color, out vec3 normale,
out float reflectivity, out float opacity, out float roughness)
{
  bool hit = false;
  dist = max_dist;
  float d;
  vec3 n;

  int objectIndice = objectNumber - 1;
  float u_dist = 0.0;
  float u_dist1 = 0.0;
  vec3 u_normal1;
  vec4 u_c1;
  float u_d1;
  float u_s1;
  float u_re1;
  bool u_hit1;
  float u_dist2 = 0.0;
  vec3 u_normal2;
  vec4 u_c2;
  float u_d2;
  float u_s2;
  float u_re2;
  bool u_hit2;
  
  bool hit_object = false;
  for (int i = csg_number - 1; i >= 0; i--)
  {
    switch (csg_type[i])
    {
    case CSG_TYPE_OBJ:
      int matriceIndice = int(csg_data[i]);
      mat4 m = objectMatrices[matriceIndice];
      mat4 mI = objectMatricesInverse[matriceIndice];
      int type = objectTypes[matriceIndice];
      int dataStartIndice = csg_objectDatasIndices[objectIndice];

      int materialIndice = matriceIndice * materialSize;
      vec4 c = vec4(
        material[materialIndice], 
        material[materialIndice + 1], 
        material[materialIndice + 2],
        material[materialIndice + 3]);
      float d = material[materialIndice + 4];
      float s = material[materialIndice + 5];
      float re = material[materialIndice + 6];
      float ro = material[materialIndice + 7];

      float c_dist = max_dist;
      vec3 c_normal;
      vec3 c_point = (mI * vec4(point, 1.0)).xyz;

      vec3 normalOffset = rand_dir(point, time);

      hit_object = false;
      switch (type)
      {
      case OBJ_TYPE_SPHERE:
        float radius = objectDatas[dataStartIndice];
        if (sphereInfos(c_point, dir, radius, c_dist, c_normal))
        {  
          c_normal = (m * vec4(c_normal, 0.0)).xyz;
          c_normal = normalize(c_normal + normalOffset * ro * ro);
          hit_object = true; 
        }
        break;
        
      case OBJ_TYPE_CUBE:
        float boundX = objectDatas[dataStartIndice];
        float boundY = objectDatas[dataStartIndice + 1];
        float boundZ = objectDatas[dataStartIndice + 2];
        if (cubeInfos(c_point, dir, vec3(boundX, boundY, boundZ), c_dist, c_normal))
        {  
          c_normal = (m * vec4(c_normal, 0.0)).xyz;
          c_normal = normalize(c_normal + normalOffset * ro * ro);
          hit_object = true; 
        }
        break;
        
      case OBJ_TYPE_PLANE:
        float nX = objectDatas[dataStartIndice];
        float nY = objectDatas[dataStartIndice + 1];
        float nZ = objectDatas[dataStartIndice + 2];
        if (planeInfos(c_point, dir, vec3(nX, nY, nZ), c_dist, c_normal))
        {  
          c_normal = (m * vec4(c_normal, 0.0)).xyz;
          c_normal = normalize(c_normal + normalOffset * ro * ro);
          hit_object = true; 
        }
        break;

      case OBJ_TYPE_TORUS:
        float bigR = objectDatas[dataStartIndice];
        float smallR = objectDatas[dataStartIndice + 1];
        if (torusInfos(c_point, dir, bigR, smallR, c_dist, c_normal))
        {
          dist = c_dist; color = c.xyz; normale = vec3(0.0,0.0,0.0); return true;
          c_normal = (m * vec4(c_normal, 0.0)).xyz;
          c_normal = normalize(c_normal + normalOffset * ro * ro);
          hit_object = true; 
        }
        break;
      }
      pushObject(c_dist, c_normal, c, d, s, re, hit_object); 
      objectIndice--;
      
      break;

    case CSG_TYPE_UNION:
      popObject(u_dist1, u_normal1, u_c1, u_d1, u_s1, u_re1, u_hit1);
      popObject(u_dist2, u_normal2, u_c2, u_d2, u_s2, u_re2, u_hit2);
      if (u_hit1 && u_hit2)
      {
        if (u_dist1 < u_dist2)
        {
          pushObject(u_dist1, u_normal1, u_c1, u_d1, u_s1, u_re1, u_hit1 || u_hit2);
        }
        else
        {
          pushObject(u_dist2, u_normal2, u_c2, u_d2, u_s2, u_re2, u_hit1 || u_hit2);
        }
      }
      else
      {
        if (!u_hit1 && !u_hit2)
        {
          pushObject(max_dist, vec3(0.0,0.0,0.0), vec4(0.0,0.0,0.0,0.0), 0.0, 0.0, 0.0, false);
        }
        else if (u_hit1)
          pushObject(u_dist1, u_normal1, u_c1, u_d1, u_s1, u_re1, u_hit1);
        else
          pushObject(u_dist2, u_normal2, u_c2, u_d2, u_s2, u_re2, u_hit1 || u_hit2);
      }
      break;

    case CSG_TYPE_INTERSECTION:
      popObject(u_dist1, u_normal1, u_c1, u_d1, u_s1, u_re1, u_hit1);
      popObject(u_dist2, u_normal2, u_c2, u_d2, u_s2, u_re2, u_hit2);
      u_dist = max(u_dist1, u_dist2);
      if (u_hit1 && u_hit2)
      {
        if (u_dist == u_dist1)
        {
          pushObject(u_dist1, u_normal1, u_c1, u_d1, u_s1, u_re1, u_hit1 && u_hit2);
        }
        else
        {
          pushObject(u_dist2, u_normal2, u_c2, u_d2, u_s2, u_re2, u_hit1 && u_hit2);
        }
      }
      else
        pushObject(max_dist, vec3(0.0,0.0,0.0), vec4(0.0,0.0,0.0,0.0), 0.0, 0.0, 0.0, false);
      break;

    case CSG_TYPE_DIFFERENCE:
      popObject(u_dist1, u_normal1, u_c1, u_d1, u_s1, u_re1, u_hit1);
      popObject(u_dist2, u_normal2, u_c2, u_d2, u_s2, u_re2, u_hit2);
      u_dist = max(u_dist1, u_dist2);
      pushObject(u_dist, u_normal1, u_c1, u_d1, u_s1, u_re1, u_hit1 && u_hit2);
      break;
    }
  }
  vec4 c;
  float diffuse;
  float specular;
  //float reflectivity;
  popObject(dist, normale, c, diffuse, specular, reflectivity, hit);
  color = c.xyz;
  opacity = 1.0;
  roughness = 0.0;
  return hit;

  /*
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
    color = vec3(1.0, 1.0, 1.0)*0.3;
    normale = n;
    hit = true;
    reflectivity = 0.9;
    opacity = 1.0;
    roughness = 0.2;
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
    color = vec3(1.0, 0.6, 1.0)*0.8;
    normale = n;
    hit = true;
    reflectivity = 0.8;
    opacity = 1.0;
    roughness = 0.0;
  }
  if (planeInfos(point, dir, vec3(-5.0, 0.0, 0.0), vec3(1, 0, 0), d, n) && d < dist)
  {
    dist = d;
    color = vec3(0.95, 0.95, 0.95)*0.8;
    normale = n;
    hit = true;
    reflectivity = 0.9;
    opacity = 1.0;
    roughness = 0.3;
  }
  return hit;
  */
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
  else if (opacity < 1.0)
  {
    float specular = max(0.0, dot(reflectionDir, light_dir));
    specular = pow(specular, 32.0) * opacity;
    diffuse = max(0.0, dot(normal, light_dir));

    vec3 transparentLeak = vec3(1.0,1.0,1.0);
    float distLight = length(light_pos - point);
    float totalDist = dist;
    bool hit = true;
    while (totalDist < distLight && hit && opacity < 1.0) 
    {
      transparentLeak *= (vec3(1.0,1.0,1.0) * (1.0-opacity) + opLightColor * opacity);
      point = point + light_dir * dist;
      hit = scene(point, light_dir, dist, opLightColor, opNormal, reflectivity, opacity, roughness);
      totalDist += dist;
    }
    if (totalDist >= distLight || opacity < 1.0)
    {
      result = transparentLeak * currentColor * diffuse 
      + transparentLeak * lightSpecular * specular;
    }
    else
    {
      result *= 0.0; done = true;
    }
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
        pushResult(vec3(1.0,1.0,1.0), 1.0, 0);
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
          pushTask(toPoint-toNormal*0.01, toOpacityDir, depth + 1, REFRACTION);

        if (type == REFLECTION)
        {
          pushResult(realColor, toReflectivity, resultIndice);
        }
        else
        {
          pushResult(realColor, 1.0, resultIndice);
        }
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
