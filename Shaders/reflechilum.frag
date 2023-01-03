#version 140
//430

uniform vec2 fielOfView;
uniform vec3 cameraPosition;

in vec2 screen;
in vec3 dir;
in vec2 coord;

vec3 normal = vec3(1. ,0, 1.)  ;
vec3 vertex = vec3(0.1, 1. , 1.) ;

out vec4 finalColor ;

vec3 ambiante = vec3(0.1 , 0.1 ,0.1) ; 
vec3 diffuse = vec3(1.0 , 1.0 , 1.0) ; 
vec3 position = vec3(2.0 , 1.0  ,0.);  
float radius = 5.0 ;
float epsilon = 0.0003;
float max_dist = 10000.0;

float distance(vec3 point, vec3 point2){
  return sqrt(pow(point2.x - point.x, 2.) + pow(point2.y - point.y, 2.) + pow(point2.z - point.z, 2.));
}

float sphere(vec3 point, vec3 position, float radius)
{
  return distance(point, position) -radius;
}

void sphereInfos(vec3 point, vec3 position, float radius, out float dist, out vec3 normale)
{
  dist = sphere(point, position, radius);
  float dx = sphere(point + vec3(epsilon, 0.0, 0.0), position, radius) - dist;
  float dy = sphere(point + vec3(0.0, epsilon, 0.0), position, radius) - dist;
  float dz = sphere(point + vec3(0.0, 0.0, epsilon), position, radius) - dist;
  normale = vec3(dx, dy, dz) / epsilon;
}

void scene(vec3 point, out float dist, out vec3 color, out vec3 normale)
{
    dist = max_dist;
    float d;
    vec3 n;
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
        color = vec3(0.0, 0.0, 1.0);
        normale = n;
    }
}


vec3 computeLighting(void){
  vec3 ret ;
  vec3 lightVector = position - vertex ;
  float attenuation = 1.0 - ( 3.0 / radius) ;

  lightVector = normalize(lightVector) ; 
  vec3 norm = normalize(normal) ; 
  
  attenuation *= dot(lightVector , norm) ; 

  attenuation = max(0.0 , attenuation ) ; 

  ret = diffuse ; 
  ret *= attenuation ; 

  return ret; 
}
// fonction de la reflexion ou on peut utiliser le fonction reflect qui permet de faire la reflexion d'une lumiere source recu .
float reflection(vec3 source , vec3 normale){
  return source - 2*(dot(normale, source))*normale ; 
}


void main() {
  vec3 finalColor = ambiante ;
  vec3 origin = -cameraPosition ; 
  vec3 point  = origin ; 
  vec3 c ; 
  vec3 n ;  
  float d; 

  scene(point,  d , c, n ) ; 

  
  finalColor.rgb += computeLighting().rgb  ;
  // Utilisation de la normal avec la fonction reflect pour lumière reflechi 
  finalColor *= reflect(point, n);

  gl_FragColor = vec4(finalColor , 1.0) ;
}
