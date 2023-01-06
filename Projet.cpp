#include <GL/glew.h>
#include <glm/glm.hpp>

#include <iostream>
#include <SDL/SDL.h>
#include <glm/gtc/matrix_transform.hpp>
#include <vector>

using namespace std;
using namespace glm;

#include "CSG.h"
#include "Scene.h"
#include "Renderer.h"
#include "Camera.h"

#include "Material.h"
#include "Timer.h"

#include "Objects/Sphere.h"
#include "Objects/Cube.h"
#include "Objects/Plane.h"
#include "Objects/Torus.h"

int WIDTH = 800;//800
int HEIGHT = 600;//600

Camera camera(vec3(0.0f, 0.0f, 0.0f), vec3(0.0f,0.0f,0.0f), vec2(90.0f, 90.0f));

void keyboard(SDLKey key, int stat);
void mouse(int button,int stat,int x,int y);
void mousemotion(int x,int y);

bool dragCamera = false;
int xhold = 0;
int yhold = 0;

bool moveForward = false;
bool moveBackward = false;
bool moveRight = false;
bool moveLeft = false;
bool moveUp = false;
bool moveDown = false;

bool fpsMode = true;

int FRAME_TIME = 1;

///
/*
FPS MODE : APPUYER SUR F POUR LE CHANGER ET DEPLACER LA CAMERA COMME SI ON GLISSAIT LA SOURIS SUR L'ECRAN


*/
///


int main(int argc, char** argv)
{
    if ( SDL_Init( SDL_INIT_VIDEO ) < 0 )
    {
        printf( "Unable to init SDL: %s\n", SDL_GetError() );
        return 1;
    }

    // make sure SDL cleans up before exit
    atexit(SDL_Quit);


    std::string shader = "shader";
    if (argc > 1)
      shader = argv[1];
    Renderer renderer(WIDTH, HEIGHT, shader);

    Scene scene;
    Material white(vec3(1.0f,1.0f,1.0f), 0.7f, 20.0f, 0.2f);
    Material red(vec3(1.0f,0.0f,0.0f), 0.7f, 20.0f, 0.3f);
    Material purple(vec3(0.7f,0.0f,0.7f), 0.7f, 20.0f, 0.1f);
    Material gold(vec3(1.0f,0.86f,0.2f), 0.9f, 20.0f, 0.0f);

    Sphere sphere1(vec3(0.0f, 0.0f, -5.0f), 1.0f, red);
    Cube cube1(vec3(1.0f, 0.0f, -5.0f), vec3(1.0f), white);
    Plane plane(vec3(0.0f, 3.0f, 0.0f), vec3(0.0f, -1.0f, 0.0f), white);
    Cube cube2(vec3(-2.0f, 1.0f, -3.0f), vec3(1.0f), gold);
    Torus torus1(vec3(-2.0f, 1.0f, -2.0f), 1.0f, 0.2f, purple);

    CSG csg(
            //new CSG(&sphere1), 
            //new CSG(&cube1), 
            //CSG::Type::Intersection, 1.0f
        new CSG(
            new CSG(
                new CSG(&cube2),
                new CSG(&torus1),
                CSG::Type::Intersection, 1.0f
            ), 
            new CSG(&plane),
            CSG::Type::Union, 1.0f
        ), 
        new CSG(
            new CSG(&sphere1), 
            new CSG(&cube1), 
            CSG::Type::Difference, 1.0f
        ), 
        CSG::Type::Union, 1.0f
    );

    scene.addCSG(&csg);

    float deltaTime = 0.0;

    bool done = false;
    while (!done)
    {
        Timer::start(FRAME_TIME);

        SDL_Event event;
        while (SDL_PollEvent(&event))
        {
            // check for messages
            switch (event.type)
            {
                // exit if the window is closed
                case SDL_QUIT:
                    done = true;
                    break;

                    // check for keypresses
                case SDL_KEYDOWN:

                    // exit if ESCAPE is pressed
                    if (event.key.keysym.sym == SDLK_ESCAPE)
                        done = true;
                    keyboard(event.key.keysym.sym, SDL_KEYDOWN);
                    break;
                    // check for keypresses
                case SDL_KEYUP:
                    keyboard(event.key.keysym.sym, SDL_KEYUP);
                    break;
                    
                case SDL_MOUSEBUTTONDOWN:
                    mouse(event.button.button,SDL_MOUSEBUTTONDOWN, event.button.x,event.button.y) ;
                    break;
                case SDL_MOUSEBUTTONUP:
                    mouse(event.button.button,SDL_MOUSEBUTTONUP, event.button.x,event.button.y) ;
                    break;
                case SDL_MOUSEMOTION:
                    mousemotion(event.button.x,event.button.y) ;
                    break;
            } // end switch
        } // end of message processing

        vec3 movement(0.0f);
        if (moveForward) movement += camera.getForward();
        if (moveBackward) movement -= camera.getForward();
        if (moveRight) movement += camera.getRight();
        if (moveLeft) movement -= camera.getRight();
        if (moveUp) movement += camera.getUp();
        if (moveDown) movement -= camera.getUp();
        if (movement.x != 0.0f || movement.y != 0.0f || movement.z != 0.0f)
        {
            movement = normalize(movement);
            //std::cout << "moved camera (" << movement.x << "," << movement.y << "," << movement.z << ")" << std::endl;
            camera.move(movement * deltaTime * 3.0f);
        }

        renderer.draw(camera, scene, deltaTime);
        //On echange les buffers
        SDL_GL_SwapBuffers();

        deltaTime = Timer::end(FRAME_TIME, TIME_TYPE::MILLISECONDES) / 1000.0f;
    }
}

void keyboard(SDLKey key, int stat)
{
    if (stat == SDL_KEYDOWN)
    {
        //std::cout << "inputed key " << key << std::endl;
        switch (key)
        {
            case SDLK_z: moveForward = true; break;
            case SDLK_s: moveBackward = true; break;
            case SDLK_q: moveRight = true; break;
            case SDLK_d: moveLeft = true; break;
            case SDLK_SPACE: moveUp = true; break;
            case SDLK_LSHIFT: moveDown = true; break;
        }
    }
    if (stat == SDL_KEYUP)
    {
        //std::cout << "released key " << key << std::endl;
        switch (key)
        {
            case SDLK_f: fpsMode = !fpsMode; break;

            case SDLK_z: moveForward = false; break;
            case SDLK_s: moveBackward = false; break;
            case SDLK_q: moveRight = false; break;
            case SDLK_d: moveLeft = false; break;
            case SDLK_SPACE: moveUp = false; break;
            case SDLK_LSHIFT: moveDown = false; break;
        }
    }
}

void mouse(int button,int stat,int x,int y)
{
    if (button == SDL_BUTTON_LEFT && stat == SDL_MOUSEBUTTONDOWN)
    {
        //std::cout << "clicking mouse" << std::endl;
        dragCamera = true;
        xhold = x;
        yhold = y;
    }
    if (button == SDL_BUTTON_LEFT && stat == SDL_MOUSEBUTTONUP)
    {
        //std::cout << "releasing mouse" << std::endl;
        dragCamera = false;
    }
}

void mousemotion(int x,int y)
{
    if (dragCamera)
    {
        float dtx = x - xhold;
        float dty = y - yhold;
        float anglex = dtx / WIDTH * 2.2f;
        float angley = dty / HEIGHT * 2.2f;
        if (fpsMode)
        {
            anglex = -anglex;
            angley = angley;
        }
        else
        {
            anglex = anglex;
            angley = -angley;
        }
        //std::cout << "camera rotation " << anglex << "," << angley << std::endl;
        camera.rotateX(angley);
        camera.rotateY(anglex);

    }
    xhold = x;
    yhold = y;
}