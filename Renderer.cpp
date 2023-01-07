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


// Fonction pour charger et compiler des vertex et fragment shaders
GLuint LoadShaders(const char * vertex_file_path,const char * fragment_file_path);

Renderer::Renderer(int width, int height, std::string shaderBaseName){
  screenWidth = width;
  screenHeight = height;

 // Création d'une nouvelle fenêtre
  window = SDL_SetVideoMode(width, height, 16, SDL_OPENGL | SDL_DOUBLEBUF);
  if (!window)
  {
    printf("Unable to set %i, %i video: %s\n", width, height, SDL_GetError());
    return;
  }
  //initialisation de GLEW
  GLenum err = glewInit();

  // Affichage des informations sur la version OpenGL et GLSL
  std::cout << std::endl<< "***** Info GPU *****" << std::endl;
  std::cout << "Fabricant : " << glGetString (GL_VENDOR) << std::endl;
  std::cout << "Carte graphique: " << glGetString (GL_RENDERER) << std::endl;
  std::cout << "Version : " << glGetString (GL_VERSION) << std::endl;

  // Initialisation d'OpenGL
  initOpenGL(shaderBaseName);
  time = 0.0f;
}

Renderer::~Renderer(){
  glDeleteProgram(programID);
  programID = -1;
}

// Méthode pour initialiser OpenGL
void Renderer::initOpenGL(std::string shaderBaseName){
	// Charge les shaders
  string vert = "./Shaders/" + shaderBaseName + ".vert";
  string frag = "./Shaders/" + shaderBaseName + ".frag";
  programID = LoadShaders(vert.c_str(), frag.c_str());
  
  framebufferProgramID = LoadShaders("./frameShader.vert", "./frameShader.frag");
  basicProgramID = LoadShaders("./basicShader.vert", "./basicShader.frag");
  currentBufferIndex = 0;

	// Génère un framebuffer pour le buffer et le bind
  glGenFramebuffers(1, &newFramebuffer);
  glBindFramebuffer(GL_FRAMEBUFFER, newFramebuffer);

	// Génère une texture
  glGenTextures(1, &newTextureBuffer);
  glBindTexture(GL_TEXTURE_2D, newTextureBuffer);
  glTexImage2D(GL_TEXTURE_2D, 0, GL_RGB, screenWidth, screenHeight, 0, GL_RGB, GL_UNSIGNED_BYTE, NULL);
  glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR );
  glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
  glBindTexture(GL_TEXTURE_2D, 0);

	// Attache la texture au framebuffer courant
  glFramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, newTextureBuffer, 0);  
  
  glGenFramebuffers(1, &currentFramebuffer);
  glBindFramebuffer(GL_FRAMEBUFFER, currentFramebuffer);

	// Génère une texture
  glGenTextures(1, &currentTextureBuffer);
  glBindTexture(GL_TEXTURE_2D, currentTextureBuffer);
  glTexImage2D(GL_TEXTURE_2D, 0, GL_RGB, screenWidth, screenHeight, 0, GL_RGB, GL_UNSIGNED_BYTE, NULL);
  glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR );
  glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
  glBindTexture(GL_TEXTURE_2D, 0);

	// Attache la texture au framebuffer courant
  glFramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, currentTextureBuffer, 0);  
  
  glBindFramebuffer(GL_FRAMEBUFFER, 0);

	// Génère une texture
  glGenTextures(1, &finalTextureBuffer);
  glBindTexture(GL_TEXTURE_2D, finalTextureBuffer);
  glTexImage2D(GL_TEXTURE_2D, 0, GL_RGB, screenWidth, screenHeight, 0, GL_RGB, GL_UNSIGNED_BYTE, NULL);
  glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR );
  glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
  glBindTexture(GL_TEXTURE_2D, 0);
  

  // récupère les location des variables uniformes
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

  glGenVertexArrays(1, &vao);	// Génère un tableau de sommets et deux buffers de sommets 
  glGenBuffers(1, &vbo);
  glGenBuffers(1, &ebo);

  glBindBuffer(GL_ARRAY_BUFFER, vbo);		// Lie le buffer de sommets à l'objet de travail actuel

  glBindVertexArray(vao); 	// Lie le VAO à l'objet actuel

  glBindBuffer(GL_ARRAY_BUFFER, vbo);  
  glBufferData(GL_ARRAY_BUFFER, vertices.size() * sizeof(float), &vertices[0], GL_STATIC_DRAW); // Envoie les données de sommets au buffer de sommets en mémoire
  glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, sizeof(float) * 5, (void*)0); // Définit comment les données de sommets seront interprétées
 
 
  glEnableVertexAttribArray(0);   	 // Active l'attribut de sommet 0
  glVertexAttribPointer(1, 2, GL_FLOAT, GL_FALSE, sizeof(float) * 5, (void*)(sizeof(float) * 3)); // Définit comment les données de sommets seront interprétées
  glEnableVertexAttribArray(1);		// Active l'attribut de sommet 1

  glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, ebo);		// Lie le buffer d'indices à l'objet actuel
  glBufferData(GL_ELEMENT_ARRAY_BUFFER, indices.size() * sizeof(unsigned int), &indices[0], GL_STATIC_DRAW);		// Envoie les données d'indices au buffer d'indices en mémoire
  
 	// Délie le VAO et le buffer de sommets de l'objet de travail actuel
  glBindVertexArray(0);
  glBindBuffer(GL_ARRAY_BUFFER, 0);
}

void Renderer::draw(Camera& camera, Scene& scene, float deltaTime){
	glBindFramebuffer(GL_FRAMEBUFFER, newFramebuffer);	// Fixer le tampon de rendu actif

	glUseProgram(programID);
	glViewport(0,0,screenWidth,screenHeight); // Définir la taille de la vue

	mat4 rotation = camera.getRotationMatrix();
	glUniformMatrix4fv(locCameraRotation, 1, GL_FALSE, &rotation[0][0]);	// Envoyer la matrice de la caméra au shader
	glUniform3f(locCameraPosition,camera.getPosition().x,camera.getPosition().y,camera.getPosition().z);	// Envoyer la position de la caméra au shader
	glUniform2f(locFieldOfView, camera.getFieldOfView().x, camera.getFieldOfView().y);	// Envoyer le FOV de la caméra au shader
	glUniform2f(locScreenSize, (float)screenWidth, (float)screenHeight);		// Envoyer la taille de l'écran au shader

	glUniform1f(locDeltaTime, deltaTime);	// Envoyer l'écart de temps et le temps écoulé au shader
	glUniform1f(locTime, time);

	time += deltaTime;	//ajouter le temps
		//determiner si la camera a bougé
	bool redraw =  false;	
	steps++;
	if (camera.isMoved())
	{
		time = 0.0f;
		camera.moveResolved();	// Indiquer que la caméra a été déplacée
		redraw = true;
		steps = 1;
	}
	glUniform1f(locMoving, (redraw) ? 1.0f : 0.0f);	// Envoyer l'information de mouvement de la caméra au shader

	// Initialisation les informations de la scène (matrices, matériaux, types d'objets, etc.) à envoyer au shader
	vector<mat4> objectMatrices;
	vector<Material> objectMaterials; 	
	vector<int> objectTypes;
	vector<float> objectDatas;
	vector<int> csg_type;
	vector<float> csg_value;
	vector<int> csg_objectDatasIndices;
		// Récupère les informations de la scène à envoyer au shader
	scene.getInfos(objectMatrices, objectMaterials, objectTypes, objectDatas, 
	csg_type, csg_value, csg_objectDatasIndices);
	
		// Envoie les matrices de transformation des objets au shader
	glUniformMatrix4fv(locObjectMatrices, objectMatrices.size(), 
	GL_FALSE, glm::value_ptr(objectMatrices[0]));

		// Calcule les matrices de transformation inverses pour chaque objet de la scène
	vector<mat4> objectMatricesInverse(objectMatrices.size());
	int i = 0;
	for (auto matrice : objectMatrices)
	{
		objectMatricesInverse[i] = inverse(matrice);
		i++;
	}

	// Envoie les matrices de transformation inverses au shader
	glUniformMatrix4fv(locObjectMatricesInverse, objectMatricesInverse.size(), 
	GL_FALSE, glm::value_ptr(objectMatricesInverse[0]));

		// Prépare les données de chaque matériau pour être envoyées au shader
	vector<float> materials;
	for(int i = 0; i < objectMaterials.size(); i++){
		materials.push_back(objectMaterials[i].color.x);
		materials.push_back(objectMaterials[i].color.y);
		materials.push_back(objectMaterials[i].color.z);
		materials.push_back(objectMaterials[i].color.w);
		materials.push_back(objectMaterials[i].diffuse);
		materials.push_back(objectMaterials[i].specular);
		materials.push_back(objectMaterials[i].reflection);
		materials.push_back(objectMaterials[i].roughness);
	}
		// Envoie les propriétés matérielles au shader
	glUniform1fv(locMaterial, materials.size(), materials.data());
	int materialSize = materials.size() / objectMaterials.size();
	glUniform1i(locMaterialSize, materialSize);	 // Envoie le nombre de propriétés matérielles par objet au shader

		// Envoie les types d'objets au shader
	glUniform1iv(locObjectTypes, objectTypes.size(), objectTypes.data());
	glUniform1fv(locObjectDatas, objectDatas.size(), objectDatas.data());
		// Envoie le nombre d'objets au shader
	glUniform1i(locObjectNumber, objectTypes.size());
	
	glUniform1iv(locCsg_types, csg_type.size(), csg_type.data());	// Envoie les types de CSG au shader
	glUniform1fv(locCsg_values, csg_value.size(), csg_value.data());	// Envoie les valeurs de CSG au shader
	glUniform1iv(locCsg_objectDatasIndices, csg_objectDatasIndices.size(), csg_objectDatasIndices.data()); // Envoie les indices des objets de CSG au shader
	glUniform1i(locCsg_number, csg_type.size());	// Envoie le nombre de CSG au shader

		
	glClear(GL_COLOR_BUFFER_BIT);	// Efface le buffer de couleur
	glClearColor(0.0f, 0.0f, 0.0f, 1.0f);	// Définit la couleur de fond


	glBindVertexArray(vao);	// Lie le Vertex Array Object et dessine les triangles
	glDrawElements(GL_TRIANGLES, indices.size(), GL_UNSIGNED_INT, 0);


	glBindFramebuffer(GL_FRAMEBUFFER, currentFramebuffer); // back to default

	glUseProgram(framebufferProgramID);
	glViewport(0,0,screenWidth,screenHeight); // Utilise le programme de Framebuffer et spécifie la vue à utiliser

	glClearColor(0.0f, 0.0f, 0.0f, 1.0f); // Efface le buffer de couleur
	glClear(GL_COLOR_BUFFER_BIT);
  
	glDisable(GL_DEPTH_TEST);	// Désactive le test de profondeur

	glUniform1i(currentFrameLocation, 0); // Envoie l'emplacement de la texture du Framebuffer courant au shader
	glUniform1i(newFrameLocation, 1); // Envoie l'emplacement de la texture du nouveau Framebuffer au shader

	if (redraw || wasRedrawn)	
	{							//l'image doit être redessinée ou a été redessinée 
		glUniform1f(keepLastFrameLocation, 0.0f);		// Envoie 0.0 au shader pour indiquer de ne pas garder l'image précédente
	}
	else{
		glUniform1f(keepLastFrameLocation, 1.0f);	// Envoie 1.0 au shader pour indiquer de garder l'image précédente
	}
	glUniform1f(timeFrameLocation, time);		// Envoie le temps écoulé depuis le début de l'application au shader
	glUniform1i(stepsFrameLocation, steps);		// Envoie le nombre de pas de temps (étapes) au shader

	// Active la texture du Framebuffer courant et lie la texture au contexte OpenGL
	glActiveTexture(GL_TEXTURE0 + 0); 
	glBindTexture(GL_TEXTURE_2D, finalTextureBuffer);
	// Active la texture du nouveau Framebuffer et lie la texture au contexte OpenGL
	glActiveTexture(GL_TEXTURE0 + 1); 
	glBindTexture(GL_TEXTURE_2D, newTextureBuffer);
	
	glBindVertexArray(vao);	// Lie le VAO et dessine les triangles en utilisant les indices stockés dans le VBO d'indices
	glDrawElements(GL_TRIANGLES, indices.size(), GL_UNSIGNED_INT, 0);

	glBindTexture(GL_TEXTURE_2D, finalTextureBuffer);		// Lie la texture du Framebuffer final et copie l'image du nouveau Framebuffer dans la texture
	glCopyTexSubImage2D(GL_TEXTURE_2D, 0, 0, 0, 0, 0, screenWidth, screenHeight);

	glBindFramebuffer(GL_FRAMEBUFFER, 0);	// Lie le Framebuffer par défaut
	glUseProgram(basicProgramID);			// Utilise le programme de base 
	glActiveTexture(GL_TEXTURE0 + 0); 		// Active la texture du Framebuffer final et la lie au contexte OpenGL
	glBindTexture(GL_TEXTURE_2D, finalTextureBuffer);
	glBindVertexArray(vao);					// Lie le VAO et dessine les triangles en utilisant les indices stockés dans le VBO d'indices
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
