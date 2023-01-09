#include "Scene.h"

Scene::Scene(){


}

Scene::~Scene(){

}

// Permet de définir les objets présents sur la scène
void Scene::setListObjects(std::vector<Object*> objects){
    this->listObjects = objects;
}

// Permet d'obtenir les objets présents sur la scène
std::vector<Object*> Scene::getListObjects(){
    return this->listObjects;
}

// Permet d'obtenir les opérations CSGs des objets présents sur la scène
std::vector<CSG*> Scene::getCSGsOperations(){
    return this->csgOperations;
}

// Permet d'ajouter un objet sur la scène
void Scene::addObject(Object* object){
    this->listObjects.push_back(object);
}

// Permet de modifier les objets présents sur la scène
void Scene::updateObject(int id,Object* o){
    this->listObjects.at(id) = o;
}

// Permet de retirer un objet de la scène
void Scene::removeObject(int id){
    this->listObjects.erase(this->listObjects.begin(),this->listObjects.begin()+id);
}

// Permet de convertir les objets de la scène en matrices
std::vector<mat4> Scene::objectsToVec4s(){
    // On crée la liste de matrice
    std::vector<mat4> res;

    for (auto o : this->listObjects) {
        // On parcout tous les objets de la scène

        // On transforme l'objet converné en matrice
        mat4 t = translate(mat4(), o->getPosition());
        mat4 r = 
            rotate(mat4(), o->getRotation().z, vec3(0.0f, 0.0f, 1.0f)) *
            rotate(mat4(), o->getRotation().y, vec3(0.0f, 1.0f, 0.0f)) *
            rotate(mat4(), o->getRotation().x, vec3(1.0f, 0.0f, 0.0f));
        mat4 s = scale(mat4(), o->getScale());
 
        res.push_back(t * r * s);
    }

    // On retourne le résultat
    return res;
}


/*
Cette fonction ordonne les informations pour que le renderer n'ait presque plus qu'à les enovyer au shader directement
Ici, il faut parcourir la liste de CSG et pour chaque CSG, utiliser la fonction reccursiveInfos définie plus bas
*/
void Scene::getInfos(vector<mat4>& objectMatrices, vector<Material>& objectMaterials, vector<int>& objectTypes, vector<float>& objectDatas, 
    vector<int>& csg_types, vector<float>& csg_values, vector<int>& csg_objectDatasIndices)
{

    for (auto csg : this->getCSGsOperations()) {
        reccursiveInfos(csg,objectMatrices,objectMaterials,objectTypes,objectDatas, 
        csg_types,csg_values,csg_objectDatasIndices);
    }
}

// Permet de définir un ensemble d'opérations CSGs pour les objets de la scène
void Scene::setCSGsOperations(std::vector<CSG*> csg){
    this->csgOperations = csg;
}

// Permet d'ajouter une opération CSG à la liste des opérations CSGs
void Scene::addCSG(CSG* csg)
{
    this->csgOperations.push_back(csg);
}

/*
Cette fonction parcours les opéations CSG de façon récursive.
*/
void Scene::reccursiveInfos(CSG* csg_actuel,
            vector<mat4>& objectMatrices, vector<Material>& objectMaterials, vector<int>& objectTypes, vector<float>& objectDatas, 
            vector<int>& csg_types, vector<float>& csg_values, vector<int>& csg_objectDatasIndices)
{
    // Si le csg est un objet
    if(csg_actuel->isObject()){
        // Ajout Type copie du CSG actuel
        csg_types.push_back(csg_actuel->getType());


        // La value a ajouter correspondra a l'indice de l'objet du CSG actuel par rapport a la liste objMatrices
        int value = objectMatrices.size();
        csg_values.push_back(value);

        Object* o = csg_actuel->object;
        mat4 t = translate(mat4(1.0f), o->getPosition());
        mat4 r = 
            rotate(mat4(1.0f), o->getRotation().z, vec3(0.0f, 0.0f, 1.0f)) *
            rotate(mat4(1.0f), o->getRotation().y, vec3(0.0f, 1.0f, 0.0f)) *
            rotate(mat4(1.0f), o->getRotation().x, vec3(1.0f, 0.0f, 0.0f));
        mat4 s = scale(mat4(1.0f), o->getScale());
        mat4 matrix = t * r * s;
        
        // Ajout des infos de l'object aux listes objectMatrics, objectMaterials, objectTypes et objectDatas


        objectMatrices.push_back(matrix);
        objectMaterials.push_back(o->getMaterial());
        csg_objectDatasIndices.push_back(objectDatas.size());
        objectTypes.push_back(o->getTypeData(objectDatas));


    }else{
        // On est dans une branche normale qui propose une operation
        csg_types.push_back(csg_actuel->getType());

        int value = csg_actuel->value;
        csg_values.push_back(value);

        //  Parcourt Enfant A, Parcourt Enfant B, Ajout Type et Value actuel a leurs listes correspondantes
        reccursiveInfos(csg_actuel->childA, objectMatrices, objectMaterials,objectTypes, objectDatas,
            csg_types, csg_values, csg_objectDatasIndices);
        reccursiveInfos(csg_actuel->childB, objectMatrices, objectMaterials,objectTypes, objectDatas,
            csg_types, csg_values, csg_objectDatasIndices);

    }

}