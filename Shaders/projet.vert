#version 140
//430


//layout(location = 0) in vec3 position; // le location permet de dire de quel flux/canal on récupère la données
//layout(location = 1) in vec3 color; // le location permet de dire de quel flux/canal on récupère la données
//layout(location = 1) in vec2 uv; // le location permet de dire de quel flux/canal on récupère la données

in vec3 position;

uniform mat4 cameraRotation;

uniform vec2 screen_size;

//out vec3 out_color;
out vec2 screen;
out vec3 dir;
out vec2 coord;

void main(){
  gl_Position = vec4(position, 1.0f);
  coord = vec2((gl_Position.x + 1.0f) / 2.0f, (-gl_Position.y + 1.0f) / 2.0f);
  screen.x = coord.x * screen_size.x;
  screen.y = coord.y * screen_size.y;

  dir = vec3((coord.x - 0.5) * screen_size.x / screen_size.y * 2.0, (coord.y - 0.5) * 2.0, -1.0);
  dir = normalize(dir);
  dir = (cameraRotation * vec4(dir.x, dir.y, dir.z, 1.0)).xyz;
}
