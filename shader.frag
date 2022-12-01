#version 430


in vec3 out_color;
in vec2 out_uv;

out vec4 finalColor;


float psin(float x)
{
  return sin(x) * 0.5f + 0.5f;
}
float pcos(float x)
{
  return cos(x) * 0.5f + 0.5f;
}

//axis aligned
float distRect(vec3 ro,vec3 RectCenter,float RectHeight,float RectWidth) {
      float dx = max(abs(ro.x-RectCenter.x)-RectWidth/2,0);
      float dy = max(abs(ro.y-RectCenter.y)-RectHeight/2,0);
      return sqrt(dx * dx + dy * dy);

}

float pointRectDist (vec3 ro, vec3 RectCenter,float rwidth,float rheight)
{
    float cx = max(min(ro.x, RectCenter.x+rwidth ), RectCenter.x);
    float cy = max(min(ro.y, RectCenter.y+rheight), RectCenter.y);
    return sqrt( (ro.x-cx)*(ro.x-cx) + (ro.y-cy)*(ro.y-cy) );
}

bool hitRect(vec3 ro,vec3 rd, float rwidth,float rheight){
  int L=1000;
  float P=0.01;
  vec3 rp = vec3(ro.x, ro.y, ro.z) ;

  for(int i=0;i<L;i++){
    float dist=pointRectDist(rp,rd,rwidth,rheight);

    if(dist<=0.0){
      return true;
    }

      /* rp.x += dist * rd.x;
       rp.y += dist * rd.y;
       rp.z += dist * rd.z;*/

  }

  return false; //boucle terminée sans collision


}



bool hitSphere(vec3 ro, vec3 rd, vec3 so, float sr)
{
    int L = 1000;
    float P = 0.01;

    vec3 rp = vec3(ro.x, ro.y, ro.z) ; //position du point qui avance vers la sphère
 
    for (int i=0; i < L; i++)
    {
       float dist = distance(rp, so); //distance entre le point à check et la sphère
       dist = dist - sr; //la sphère ayant un rayon, on l'enlève pour la vraie distance

       if (dist < P)
          return true; //ou return la couleur de la sphère dans tous les cas il y a collision

       //pas de collision pour l'heure, alors on avance le point en suivant la direction du rayon
       rp.x += dist * rd.x;
       rp.y += dist * rd.y;
       rp.z += dist * rd.z;
       //on peu se avancer de toute la distance comme on sait qu'on ne touche pas la sphère malgré celle-ci
    }
    return false; //boucle terminée sans collision
}

float mandelbrot(vec2 pos)
{
float scale = 1.5f;
float x = pos.x * 5 - 2.5f;
float y = pos.y * 5 - 2.5f;
float x0 = pos.x * (scale * 2.0f) - scale;
float y0 = pos.y * (scale * 2.0f) - scale;
float x2 = 0.0f;
float y2 = 0.0f;
float w = 0.0f;
  for (int i = 0; i < 1000; i++)
  {
    x= x2 - y2 + x0;
    y= w - x2 - y2 + y0;
    x2= x * x;
    y2= y * y;
    w = (x + y) * (x + y);
    if (x2 + y2 >= 2 * 2)
      return 0.0f;
  }
  return 1.0f;
}

void main() {
  //vec3 color = vec3(psin(out_uv.x * 18.0f), pcos(out_uv.y * 18.0f), 1.0f); //* out_color;

  //vec3 color = vec3(1.0f, 1.0f, 1.0f) * mandelbrot(out_uv);
  
  //finalColor = vec4(color, 1.);
  
  vec3 RO = out_campos;
    vec3 RD = vec3((out_uv.x - 0.5) * iResolution.x / iResolution.y, (out_uv.y - 0.5), 1);
    RD = normalize(RD);

    vec3 SO = vec3(0.0 - iTime * 0.05, 0.0, 4.0 - iTime * 0.05);
    float SR = 1.0;

    vec3 col = vec3(0,0,0);
    if (hitSphere(RO, RD, SO, SR)) col = vec3(1,0,0);
    else col = vec3(1,1,1);
    // Output to screen
    fragColor = vec4(col,1.0);
}
