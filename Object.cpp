#include "Object.h"

Object::Object(vec3 position, vec3 rotation, vec3 scale, Material& material)
{
   this->position = position;
   this->rotation = rotation;
   this->scale = scale;
   this->material = material;
}

void Object::setPosition(const vec3& u) { this->position = u; }
void Object::setRotation(const vec3& u) { this->rotation = u; }
void Object::setScale(const vec3& u) { this->scale = u; }
void Object::setMaterial(Material& m) { this->material = m; }

vec3 Object::getPosition(){return this->position;}
vec3 Object::getRotation(){return this->rotation;}
vec3 Object::getScale(){return this->scale;}

Material& Object::getMaterial(){return this->material;}

 