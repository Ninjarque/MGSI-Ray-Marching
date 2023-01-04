//
// Created by bello on 23/11/2022.
//
#include "Camera.h"

using namespace std;
using namespace glm;

Camera::Camera(){

    flag = true ;
    // si on change de position initial dans la fonction setPosition
    // dans la fonction moveCamera on change la valeur
    // flag par true ;
}

Camera::~Camera(){

}
Camera::Camera(const vec3 &position, const vec3 &rotation,
               const vec2 &fieldOfView) {
    this->position = position ;
    this->rotation = rotation ;
    this->fieldOfView = fieldOfView ;
    
    flag = true ;
    // si on change de position initial dans la fonction setPosition
    // dans la fonction moveCamera on change la valeur
    // flag par true ;
}

void Camera::setFieldOfView(const vec2 &a) {
    this->fieldOfView = a ;
    flag = true ;
}

void Camera::setPosition(const vec3 &a) { // modification de la position de la camera 
    this->position = a ;
    flag = true ; // pour declancher que la camera a été bouger
}

void Camera::setRotation(const vec3 &a) { // permet la rotation de la camera 
    this->rotation = a ;
    flag = true ;
}

void Camera::move(const vec3 &m){ // pour bouger la camera selon un vecteur donnée en paramètre 
    this->position += m ;
    this->flag = true ; // pour declancher que la camera a ete bouger
}

void Camera::rotateX(const float &amount){ // changer la rotation en x 
    this->rotation.x += amount;
    if (amount != 0.0f) this->flag = true; // declancher que la camera été bouger 
}
void Camera::rotateY(const float &amount){ // changer la rotation en y 
    this->rotation.y += amount;
    if (amount != 0.0f) this->flag = true; // declancher que la camera été bouger 
}
void Camera::rotateZ(const float &amount){ // changer la rotation en z 
    this->rotation.z += amount;
    if (amount != 0.0f) this->flag = true; // declancher que la camera été bouger 
}

vec2 Camera::getFieldOfView() const {
    return this->fieldOfView ; // avoir le champ de vision de la camera
}

vec3 Camera::getPosition() const { // avoir la position de la camera
    return this->position;
}
vec3 Camera::getRotation() const { // avoir la rotation de la camera 
    return this->rotation;
}

mat4 Camera::getRotationMatrix() const { // avoir la rotation matrice de la camera 
    vec3 rotation = getRotation();
    mat4 rotationMatrix(1.0);
    rotationMatrix = rotate(mat4(1.0f), rotation.z, vec3(0.0f, 0.0f, 1.0f)) *
            rotate(mat4(1.0f), rotation.y, vec3(0.0f, 1.0f, 0.0f)) *
            rotate(mat4(1.0f), rotation.x, vec3(1.0f, 0.0f, 0.0f));
    return rotationMatrix;
}

vec3 Camera::getForward() const { // avoir l'avant de la camera 
    vec4 forward(0.0f, 0.0f, 1.0f, 1.0f);
    forward = getRotationMatrix() * forward;
    return vec3(forward.x, forward.y, forward.z);
}
vec3 Camera::getRight() const { // avoir la droite de la camera 
    vec4 right(1.0f, 0.0f, 0.0f, 1.0f);
    right = getRotationMatrix() * right;
    return vec3(right.x, right.y, right.z);
}
vec3 Camera::getUp() const { // avoir le haut de la camera 
    vec4 up(0.0f, 1.0f, 0.0f, 1.0f);
    up = getRotationMatrix() * up;
    return vec3(up.x, up.y, up.z);
}
