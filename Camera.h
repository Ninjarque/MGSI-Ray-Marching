//
// Created by bello on 21/11/2022.
//

#ifndef STARTERKITSDLSHADERCUBE_CAMERA_H
#define STARTERKITSDLSHADERCUBE_CAMERA_H
#include <GL/glew.h>
#include <GL/glew.h>
#include <glm/glm.hpp>
#include "glm/gtc/matrix_transform.hpp"

using namespace std;
using namespace glm ;

class Camera{
private :
    bool flag;
    vec3 position;
    vec3 rotation; // x et y cameraanglex et cameraangley // x et y et cameraDistance
    vec2 fieldOfView;
public:
    Camera();
int WIDTH = 800;
    Camera(const vec3 &, const vec3 &, const vec2 &);
    ~Camera() ;
    void setFieldOfView(const vec2 &);
    void setRotation(const vec3 &);
    void setPosition(const vec3 &);
    void moveCamera(const vec3 & ) ;
    
    void rotateX(const float &);
    void rotateY(const float &);
    void rotateZ(const float &);
    
    vec3 getPosition() const; 
    vec2 getFieldOfView() const ; 
    vec3 getRotation() const ;
    mat4 getRotationMatrix() const;
    vec3 getForward() const;
    vec3 getRight() const;
    vec3 getUp() const;
    
    void move(const vec3 &) ; 
    
    bool isMoved(){
        return flag ;
    }
    void moveResolved() { flag = false; }
};

#endif //STARTERKITSDLSHADERCUBE_CAMERA_H
