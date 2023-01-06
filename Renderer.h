#ifndef RENDERER_H
#define RENDERER_H
#include <GL/glew.h>
#include <glm/glm.hpp>
#include <glm/gtc/type_ptr.hpp>
#include <glm/gtx/string_cast.hpp>

#include <iostream>
#include <SDL/SDL.h>
#include <glm/gtc/matrix_transform.hpp>
#include <vector>


#include <string>

using namespace std;
using namespace glm;

#include "Camera.h"
#include "Scene.h"

class Renderer{
public:
  Renderer(int screenWidth, int screenHeight, std::string shaderBaseName);
  ~Renderer();

  void initOpenGL(std::string shaderBaseName);

  void draw(Camera& camera, Scene& scene, float deltaTime);
private:
  SDL_Surface* window;

  int programID;

  unsigned int vao;
  unsigned int vbo;
  unsigned int ebo;

  unsigned int currentFrameLocation;
  unsigned int newFrameLocation;
  unsigned int keepLastFrameLocation;
  unsigned int timeFrameLocation;
  unsigned int stepsFrameLocation;
  unsigned int framebufferProgramID;
  unsigned int basicProgramID;

  unsigned int currentFramebuffer;
  unsigned int newFramebuffer;
  unsigned int currentTextureBuffer;
  unsigned int newTextureBuffer;
  unsigned int finalTextureBuffer;
  int currentBufferIndex;

  int screenWidth;
  int screenHeight;

  float time;
  int steps = 0;
  bool wasRedrawn = false;

  int locTime;
  int locDeltaTime;
  int locMoving;

  int locCameraPosition;
  int locCameraRotation;
  int locFieldOfView;
  int locScreenSize;

  int locObjectMatrices;
  int locObjectMatricesInverse;
  int locObjectTypes;
  int locObjectDatas;
  int locObjectNumber;
  int locCsg_types;
  int locCsg_values;
  int locCsg_objectDatasIndices;
  int locCsg_number;
  
  int locMaterial;
  int locMaterialSize;
  /*
  int locColor;
  int locDiffuse;
  int locSpecular;
  int locReflection;
  int locRoughness;
  */

  std::vector<float> vertices = {
    -1.0, 1.0, 0.0, 0.0, 0.0,
    -1.0, -1.0, 0.0, 1.0, 0.0,
    1.0, -1.0, 0.0, 1.0, 1.0,
    1.0, 1.0, 0.0, 0.0, 1.0
  };
  
  std::vector<unsigned int> indices = {
    0, 1, 2,
    2, 3, 0
  };
};
#endif