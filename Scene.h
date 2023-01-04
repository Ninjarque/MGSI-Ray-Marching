#ifndef SCENE_H
#define SCENE_H

#include "iostream"
#include <GL/glew.h>
#include "glm/glm.hpp"
#include "glm/gtc/matrix_transform.hpp"
#include <vector>

#include "CSG.h"
#include "Object.h"

using namespace std;
using namespace glm;


class Scene{
    private:
        std::vector<Object*> listObjects;
        std::vector<CSG*> csgOperations;


    public:
        Scene();
        ~Scene();
        
        void addCSG(CSG* csg);
        void setCSGsOperations(std::vector<CSG*> csg);
        std::vector<CSG*> getCSGsOperations();
        std::vector<Object*> getListObjects();
        void setListObjects(std::vector<Object*> objects);
        void addObject(Object* object);
        void removeObject(int id);
        void updateObject(int id,Object* o);
        std::vector<mat4> objectsToVec4s();
        
        void getInfos(vector<mat4>& objectMatrices, vector<Material>& objectMaterials, vector<int>& objectTypes, vector<float>& objectDatas, 
    vector<int>& csg_types, vector<float>& csg_values, vector<int>& csg_objectDatasIndices);

    private:
        void reccursiveInfos(CSG* csg_actuel,
            vector<mat4>& objectMatrices, vector<Material>& objectMaterials, vector<int>& objectTypes, vector<float>& objectDatas, 
            vector<int>& csg_types, vector<float>& csg_values, vector<int>& csg_objectDatasIndices);
};

#endif