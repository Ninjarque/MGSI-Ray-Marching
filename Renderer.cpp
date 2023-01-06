#include <GL/glew.h>
#ifdef __cplusplus
#include <cstdlib>
#else
#include <stdlib.h>
#endif

#include <stdio.h>
#include <string>
#include <vector>
#include <iostream>
#include <fstream>
#include <algorithm>

using namespace std;

#include "Renderer.h"

using namespace glm;

GLuint LoadShaders(const char * vertex_file_path,const char * fragment_file_path);

Renderer::Renderer(int width, int height, std::string shaderBaseName){
  screenWidth = width;
  screenHeight = height;

  // create a new window
  window = SDL_SetVideoMode(width, height, 16, SDL_OPENGL | SDL_DOUBLEBUF);
  if (!window)
  {
    printf("Unable to set %i, %i video: %s\n", width, height, SDL_GetError());
    return;
  }
  // ATTENTION ne pas oublier l'initialisation de GLEW
  GLenum err = glewInit();

  //info version oenGL / GLSL :
  //info version oenGL / GLSL :
  std::cout << std::endl<< "***** Info GPU *****" << std::endl;
  std::cout << "Fabricant : " << glGetString (GL_VENDOR) << std::endl;
  std::cout << "Carte graphique: " << glGetString (GL_RENDERER) << std::endl;
  std::cout << "Version : " << glGetString (GL_VERSION) << std::endl;

  initOpenGL(shaderBaseName);

  time = 0.0f;
}
Renderer::~Renderer(){
  glDeleteProgram(programID);
  programID = -1;
}

void Renderer::initOpenGL(std::string shaderBaseName){
  string vert = "./Shaders/" + shaderBaseName + ".vert";
  string frag = "./Shaders/" + shaderBaseName + ".frag";
  programID = LoadShaders(vert.c_str(), frag.c_str());
  
  framebufferProgramID = LoadShaders("./frameShader.vert", "./frameShader.frag");
  basicProgramID = LoadShaders("./basicShader.vert", "./basicShader.frag");
  currentBufferIndex = 0;

  glGenFramebuffers(1, &newFramebuffer);
  glBindFramebuffer(GL_FRAMEBUFFER, newFramebuffer);

  // generate texture
  glGenTextures(1, &newTextureBuffer);
  glBindTexture(GL_TEXTURE_2D, newTextureBuffer);
  glTexImage2D(GL_TEXTURE_2D, 0, GL_RGB, screenWidth, screenHeight, 0, GL_RGB, GL_UNSIGNED_BYTE, NULL);
  glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR );
  glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
  glBindTexture(GL_TEXTURE_2D, 0);

  // attach it to currently bound framebuffer object
  glFramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, newTextureBuffer, 0);  
  
  glGenFramebuffers(1, &currentFramebuffer);
  glBindFramebuffer(GL_FRAMEBUFFER, currentFramebuffer);

  // generate texture
  glGenTextures(1, &currentTextureBuffer);
  glBindTexture(GL_TEXTURE_2D, currentTextureBuffer);
  glTexImage2D(GL_TEXTURE_2D, 0, GL_RGB, screenWidth, screenHeight, 0, GL_RGB, GL_UNSIGNED_BYTE, NULL);
  glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR );
  glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
  glBindTexture(GL_TEXTURE_2D, 0);

  // attach it to currently bound framebuffer object
  glFramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, currentTextureBuffer, 0);  
  
  glBindFramebuffer(GL_FRAMEBUFFER, 0);

  // generate texture
  glGenTextures(1, &finalTextureBuffer);
  glBindTexture(GL_TEXTURE_2D, finalTextureBuffer);
  glTexImage2D(GL_TEXTURE_2D, 0, GL_RGB, screenWidth, screenHeight, 0, GL_RGB, GL_UNSIGNED_BYTE, NULL);
  glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR );
  glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
  glBindTexture(GL_TEXTURE_2D, 0);
  
  // Get the uniform variables location. You've probably already done that before...
  currentFrameLocation = glGetUniformLocation(framebufferProgramID, "currentFrame");
  newFrameLocation  = glGetUniformLocation(framebufferProgramID, "newFrame");
  keepLastFrameLocation = glGetUniformLocation(framebufferProgramID, "keep");
  timeFrameLocation = glGetUniformLocation(framebufferProgramID, "time");
  stepsFrameLocation = glGetUniformLocation(framebufferProgramID, "steps");

  //recupere id
  locDeltaTime = glGetUniformLocation(programID, "deltaTime");
  locTime = glGetUniformLocation(programID, "time");
  locMoving = glGetUniformLocation(programID, "moving");

  locCameraPosition = glGetUniformLocation(programID, "cameraPosition");
  locCameraRotation = glGetUniformLocation(programID, "cameraRotation");
  locFieldOfView = glGetUniformLocation(programID, "fieldOfView");
  locScreenSize = glGetUniformLocation(programID, "screen_size");

  locObjectMatrices = glGetUniformLocation(programID, "objectMatrices");
  locObjectMatricesInverse = glGetUniformLocation(programID, "objectMatricesInverse");
  locObjectTypes = glGetUniformLocation(programID, "objectTypes");
  locObjectDatas = glGetUniformLocation(programID, "objectDatas");
  locObjectNumber = glGetUniformLocation(programID, "objectNumber");
  locCsg_types = glGetUniformLocation(programID, "csg_type");
  locCsg_values = glGetUniformLocation(programID, "csg_data");
  locCsg_objectDatasIndices = glGetUniformLocation(programID, "csg_objectDatasIndices");
  locCsg_number = glGetUniformLocation(programID, "csg_number");
  
  //material
  locMaterial = glGetUniformLocation(programID, "material");
  locMaterialSize = glGetUniformLocation(programID, "materialSize");
  /*
  locColor = glGetUniformLocation(programID, "color");
  locDiffuse = glGetUniformLocation(programID, "diffuse");
  locSpecular = glGetUniformLocation(programID, "specular");
  locReflection = glGetUniformLocation(programID, "reflection");
  locRoughness = glGetUniformLocation(programID, "roughness");
  */
  //locMatrixIDObject = glGetUniformLocation(programID, "Object");

  glGenVertexArrays(1, &vao);
  
  glGenBuffers(1, &vbo);
  glGenBuffers(1, &ebo);
  glBindBuffer(GL_ARRAY_BUFFER, vbo);

  glBindVertexArray(vao);

  glBindBuffer(GL_ARRAY_BUFFER, vbo);  
  glBufferData(GL_ARRAY_BUFFER, vertices.size() * sizeof(float), &vertices[0], GL_STATIC_DRAW);
  glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, sizeof(float) * 5, (void*)0);
  glEnableVertexAttribArray(0);  
  //glBufferData(GL_ARRAY_BUFFER, vertices.size() * sizeof(vec2), &uvs[0], GL_STATIC_DRAW);
  glVertexAttribPointer(1, 2, GL_FLOAT, GL_FALSE, sizeof(float) * 5, (void*)(sizeof(float) * 3));
  glEnableVertexAttribArray(1);

  glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, ebo);
  glBufferData(GL_ELEMENT_ARRAY_BUFFER, indices.size() * sizeof(unsigned int), &indices[0], GL_STATIC_DRAW);
  
  glBindVertexArray(0);
  glBindBuffer(GL_ARRAY_BUFFER, 0);
}

void Renderer::draw(Camera& camera, Scene& scene, float deltaTime){
	glBindFramebuffer(GL_FRAMEBUFFER, newFramebuffer);

	glUseProgram(programID);
	glViewport(0,0,screenWidth,screenHeight);

	mat4 rotation = camera.getRotationMatrix();
	glUniformMatrix4fv(locCameraRotation, 1, GL_FALSE, &rotation[0][0]);
	glUniform3f(locCameraPosition,camera.getPosition().x,camera.getPosition().y,camera.getPosition().z);
	glUniform2f(locFieldOfView, camera.getFieldOfView().x, camera.getFieldOfView().y);
	glUniform2f(locScreenSize, (float)screenWidth, (float)screenHeight);

	glUniform1f(locDeltaTime, deltaTime);
	glUniform1f(locTime, time);
	time += deltaTime;
	bool redraw =  false;
	steps++;
	if (camera.isMoved())
	{
		time = 0.0f;
		camera.moveResolved();
		redraw = true;
		steps = 1;
	}
	glUniform1f(locMoving, (redraw) ? 1.0f : 0.0f);

	// /*CODE POUR ENVOYER LES INFOS DE LA SCENE AU SHADER A FAIRE ICI
	//L'objectif est d'envoyer des listes de donnees au shader
	//Pour se faire, il faudra decommenter cette partie :
	//
	// /*
	vector<mat4> objectMatrices;
	vector<Material> objectMaterials; 	
	vector<int> objectTypes;
	vector<float> objectDatas;
	vector<int> csg_type;
	vector<float> csg_value;
	vector<int> csg_objectDatasIndices;
	scene.getInfos(objectMatrices, objectMaterials, objectTypes, objectDatas, 
	csg_type, csg_value, csg_objectDatasIndices);
	
	glUniformMatrix4fv(locObjectMatrices, objectMatrices.size(), 
	GL_FALSE, glm::value_ptr(objectMatrices[0]));

	vector<mat4> objectMatricesInverse(objectMatrices.size());
	int i = 0;
	for (auto matrice : objectMatrices)
	{
		objectMatricesInverse[i] = inverse(matrice);
		//std::cout << glm::to_string(matrice) << ", invert : " << glm::to_string(objectMatricesInverse[i]) << std::endl;
		i++;
	}
	glUniformMatrix4fv(locObjectMatricesInverse, objectMatricesInverse.size(), 
	GL_FALSE, glm::value_ptr(objectMatricesInverse[0]));

	vector<float> materials(objectMaterials.size() * 10);

	/*
	vector<float> colors(objectMaterials.size() * 4);
	vector<float> diffuse(objectMaterials.size());
	vector<float> specular(objectMaterials.size());
	vector<float> reflection(objectMaterials.size());
	vector<float> roughness(objectMaterials.size());
	*/

	int x = 0;
	for(int i = 0; i < objectMaterials.size(); i++){
		materials[x++] = objectMaterials[i].color.x;
		materials[x++] = objectMaterials[i].color.y;
		materials[x++] = objectMaterials[i].color.z;
		materials[x++] = objectMaterials[i].color.w;
		materials[x++] = objectMaterials[i].diffuse;
		materials[x++] = objectMaterials[i].specular;
		materials[x++] = objectMaterials[i].reflection;
		materials[x++] = objectMaterials[i].roughness;
		/*
		colors[i*4+0] = objectMaterials[i].color.x;
		colors[i*4+1] = objectMaterials[i].color.y;
		colors[i*4+2] = objectMaterials[i].color.z;
		colors[i*4+3] = objectMaterials[i].color.w;
		diffuse[i] = objectMaterials[i].diffuse;
		specular[i] = objectMaterials[i].specular;
		reflection[i] = objectMaterials[i].reflection;
		roughness[i] = objectMaterials[i].roughness;
		*/
	}

	glUniform4fv(locMaterial, materials.size(), materials.data());
	int materialSize = x / objectMaterials.size();
	glUniform1i(locMaterialSize, materialSize);
	/*
	glUniform4fv(locColor, colors.size(), colors.data());
	glUniform1fv(locDiffuse, diffuse.size(), diffuse.data());
	glUniform1fv(locSpecular, specular.size(), specular.data());
	glUniform1fv(locReflection, reflection.size(), reflection.data());
	glUniform1fv(locRoughness, roughness.size(), roughness.data());
	*/

	glUniform1iv(locObjectTypes, objectTypes.size(), objectTypes.data());
	glUniform1fv(locObjectDatas, objectDatas.size(), objectDatas.data());
	glUniform1i(locObjectNumber, objectTypes.size());
	
	glUniform1iv(locCsg_types, csg_type.size(), csg_type.data());
	glUniform1fv(locCsg_values, csg_value.size(), csg_value.data());
	glUniform1iv(locCsg_objectDatasIndices, csg_objectDatasIndices.size(), csg_objectDatasIndices.data());
	glUniform1i(locCsg_number, csg_type.size());

	// */
	/*les parametres sont note comme ca car il faut les creer avant la fonction et les passer dedans pour qu'elle les initialise
	les donnees a envoyer (uniform ou buffer), devront respecter ce format
	objectMatrices, array de mat4
	objectMaterials, array de float, avec pour chaque Material 8 float en taille (vec4 couleur, plus 4 floats des proprietes), 
		c'est important de connaitre sa taille exacte en unite pour les arrays qui convertissent un type
	objectTypes, array de int, pourrait meme etre des unsigned char tellement il n'y aura pas beaucoup de types
	objectDatas, array de float

	*/
	glClear(GL_COLOR_BUFFER_BIT);
	glClearColor(0.0f, 0.0f, 0.0f, 1.0f);

	glBindVertexArray(vao);
	glDrawElements(GL_TRIANGLES, indices.size(), GL_UNSIGNED_INT, 0);

	//glUseProgram(0);

	glBindFramebuffer(GL_FRAMEBUFFER, currentFramebuffer); // back to default
	//return;
	glUseProgram(framebufferProgramID);
	glViewport(0,0,screenWidth,screenHeight);

	glClearColor(0.0f, 0.0f, 0.0f, 1.0f); 
	glClear(GL_COLOR_BUFFER_BIT);
  
	glDisable(GL_DEPTH_TEST);

	glUniform1i(currentFrameLocation, 0);
	glUniform1i(newFrameLocation, 1);
	if (redraw || wasRedrawn)
	{
		glUniform1f(keepLastFrameLocation, 0.0f);
	}
	else{
		glUniform1f(keepLastFrameLocation, 1.0f);
	}
	glUniform1f(timeFrameLocation, time);
	glUniform1i(stepsFrameLocation, steps);

	glActiveTexture(GL_TEXTURE0 + 0); // Texture unit 0
	glBindTexture(GL_TEXTURE_2D, finalTextureBuffer);
	glActiveTexture(GL_TEXTURE0 + 1); // Texture unit 1
	glBindTexture(GL_TEXTURE_2D, newTextureBuffer);
	
	glBindVertexArray(vao);
	glDrawElements(GL_TRIANGLES, indices.size(), GL_UNSIGNED_INT, 0);

	//glActiveTexture(GL_TEXTURE0 + 0); // Texture unit 0
	glBindTexture(GL_TEXTURE_2D, finalTextureBuffer);
	glCopyTexSubImage2D(GL_TEXTURE_2D, 0, 0, 0, 0, 0, screenWidth, screenHeight);

	glBindFramebuffer(GL_FRAMEBUFFER, 0);
	glUseProgram(basicProgramID);
	//glClearColor(0.0f, 0.0f, 0.0f, 1.0f); 
	//glClear(GL_COLOR_BUFFER_BIT);
	glActiveTexture(GL_TEXTURE0 + 0); // Texture unit 1
	glBindTexture(GL_TEXTURE_2D, finalTextureBuffer);
	glBindVertexArray(vao);
	glDrawElements(GL_TRIANGLES, indices.size(), GL_UNSIGNED_INT, 0);

	wasRedrawn = redraw;
}


GLuint LoadShaders(const char * vertex_file_path,const char * fragment_file_path){

	// Create the shaders
	GLuint VertexShaderID = glCreateShader(GL_VERTEX_SHADER);
	GLuint FragmentShaderID = glCreateShader(GL_FRAGMENT_SHADER);

	// Read the Vertex Shader code from the file
	std::string VertexShaderCode;
	std::ifstream VertexShaderStream(vertex_file_path, std::ios::in);
	if(VertexShaderStream.is_open()){
		std::string Line = "";
		while(getline(VertexShaderStream, Line))
			VertexShaderCode += "\n" + Line;
		VertexShaderStream.close();
	}else{
		printf("Impossible to open %s. Are you in the right directory ? Don't forget to read the FAQ !\n", vertex_file_path);
		getchar();
		return 0;
	}

	// Read the Fragment Shader code from the file
	std::string FragmentShaderCode;
	std::ifstream FragmentShaderStream(fragment_file_path, std::ios::in);
	if(FragmentShaderStream.is_open()){
		std::string Line = "";
		while(getline(FragmentShaderStream, Line))
			FragmentShaderCode += "\n" + Line;
		FragmentShaderStream.close();
	}



	GLint Result = GL_FALSE;
	int InfoLogLength;



	// Compile Vertex Shader
	printf("Compiling shader : %s\n", vertex_file_path);
	char const * VertexSourcePointer = VertexShaderCode.c_str();
	glShaderSource(VertexShaderID, 1, &VertexSourcePointer , NULL);
	glCompileShader(VertexShaderID);

	// Check Vertex Shader
	glGetShaderiv(VertexShaderID, GL_COMPILE_STATUS, &Result);
	glGetShaderiv(VertexShaderID, GL_INFO_LOG_LENGTH, &InfoLogLength);
	if ( InfoLogLength > 0 ){
		std::vector<char> VertexShaderErrorMessage(InfoLogLength+1);
		glGetShaderInfoLog(VertexShaderID, InfoLogLength, NULL, &VertexShaderErrorMessage[0]);
		printf("%s\n", &VertexShaderErrorMessage[0]);
	}



	// Compile Fragment Shader
	printf("Compiling shader : %s\n", fragment_file_path);
	char const * FragmentSourcePointer = FragmentShaderCode.c_str();
	glShaderSource(FragmentShaderID, 1, &FragmentSourcePointer , NULL);
	glCompileShader(FragmentShaderID);

	// Check Fragment Shader
	glGetShaderiv(FragmentShaderID, GL_COMPILE_STATUS, &Result);
	glGetShaderiv(FragmentShaderID, GL_INFO_LOG_LENGTH, &InfoLogLength);
	if ( InfoLogLength > 0 ){
		std::vector<char> FragmentShaderErrorMessage(InfoLogLength+1);
		glGetShaderInfoLog(FragmentShaderID, InfoLogLength, NULL, &FragmentShaderErrorMessage[0]);
		printf("%s\n", &FragmentShaderErrorMessage[0]);
	}



	// Link the program
	printf("Linking program\n");
	GLuint ProgramID = glCreateProgram();
	glAttachShader(ProgramID, VertexShaderID);
	glAttachShader(ProgramID, FragmentShaderID);
	glLinkProgram(ProgramID);

	// Check the program
	glGetProgramiv(ProgramID, GL_LINK_STATUS, &Result);
	glGetProgramiv(ProgramID, GL_INFO_LOG_LENGTH, &InfoLogLength);
	if ( InfoLogLength > 0 ){
		std::vector<char> ProgramErrorMessage(InfoLogLength+1);
		glGetProgramInfoLog(ProgramID, InfoLogLength, NULL, &ProgramErrorMessage[0]);
		printf("%s\n", &ProgramErrorMessage[0]);
	}

	glDeleteShader(VertexShaderID);
	glDeleteShader(FragmentShaderID);

	return ProgramID;
}
