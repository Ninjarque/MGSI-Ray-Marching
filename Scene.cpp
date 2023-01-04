#include "Scene.h"

Scene::Scene(){


}

Scene::~Scene(){

}
void Scene::setListObjects(std::vector<Object*> objects){
    this->listObjects = objects;
}
std::vector<Object*> Scene::getListObjects(){
    return this->listObjects;
}
std::vector<CSG*> Scene::getCSGsOperations(){
    return this->csgOperations;
}
void Scene::addObject(Object* object){
    this->listObjects.push_back(object);
}
void Scene::updateObject(int id,Object* o){
    this->listObjects.at(id) = o;
}
void Scene::removeObject(int id){
    this->listObjects.erase(this->listObjects.begin(),this->listObjects.begin()+id);
}
std::vector<mat4> Scene::objectsToVec4s(){
    std::vector<mat4> res;

    //vector<Object>::iterator it;
    //int i = 0;
    //for(it = this->listObjects.begin(); it != this->listObjects.end(); it++,i++ )    {
    for (auto o : this->listObjects) {
        mat4 t = translate(mat4(), o->getPosition());
        mat4 r = 
            rotate(mat4(), o->getRotation().z, vec3(0.0f, 0.0f, 1.0f)) *
            rotate(mat4(), o->getRotation().y, vec3(0.0f, 1.0f, 0.0f)) *
            rotate(mat4(), o->getRotation().x, vec3(1.0f, 0.0f, 0.0f));
        mat4 s = scale(mat4(), o->getScale());
        //mat3 * mat = new mat3(o.getPosition(),o.getRotation(),o.getScale());
        //mat3s.push_back(mat);
        res.push_back(t * r * s);
    }

    return res;
}

void Scene::getInfos(vector<mat4>& objectMatrices, vector<Material>& objectMaterials, vector<int>& objectTypes, vector<float>& objectDatas, 
    vector<int>& csg_types, vector<float>& csg_values, vector<int>& csg_objectDatasIndices)
{
    /*L'OBJECTIF EST ICI DE FAIRE UN CODE RECCURSIF QUI ORDONNE LES INFOS 
    POUR QUE LE RENDERER N'AI PRESQUE PLUS QU'A LES ENVOYER AU SHADER DIRECTEMENT

    Ici il faut parcourir la liste de CSG et pour chaque CSG, utiliser la fonction reccursiveInfos
    */
    for (auto csg : this->getCSGsOperations()) {
        reccursiveInfos(csg,objectMatrices,objectMaterials,objectTypes,objectDatas, 
        csg_types,csg_values,csg_objectDatasIndices);
    }
}
void Scene::setCSGsOperations(std::vector<CSG*> csg){
    this->csgOperations = csg;
}
void Scene::addCSG(CSG* csg)
{
    this->csgOperations.push_back(csg);
}
void Scene::reccursiveInfos(CSG* csg_actuel,
            vector<mat4>& objectMatrices, vector<Material>& objectMaterials, vector<int>& objectTypes, vector<float>& objectDatas, 
            vector<int>& csg_types, vector<float>& csg_values, vector<int>& csg_objectDatasIndices)
{
    if(csg_actuel->isObject()){
        csg_types.push_back(csg_actuel->getType());

        int value = objectMatrices.size();
        csg_values.push_back(value);

        Object* o = csg_actuel->object;
        mat4 t = translate(mat4(), o->getPosition());
        mat4 r = 
            rotate(mat4(), o->getRotation().z, vec3(0.0f, 0.0f, 1.0f)) *
            rotate(mat4(), o->getRotation().y, vec3(0.0f, 1.0f, 0.0f)) *
            rotate(mat4(), o->getRotation().x, vec3(1.0f, 0.0f, 0.0f));
        mat4 s = scale(mat4(), o->getScale());
        mat4 matrix = t * r * s;
        //translate(mat4(), csg_actuel->object->getPosition()) * rotate(mat4(), csg_actuel->object->getRotation().length(), csg_actuel->object->getRotation()) * scale(mat4(), csg_actuel->object->getScale());
        
        objectMatrices.push_back(matrix);
        objectMaterials.push_back(o->getMaterial());
        csg_objectDatasIndices.push_back(objectDatas.size());
        objectTypes.push_back(o->getTypeData(objectDatas));


    }else{
        reccursiveInfos(csg_actuel->childA, objectMatrices, objectMaterials,objectTypes, objectDatas,
            csg_types, csg_values, csg_objectDatasIndices);
        reccursiveInfos(csg_actuel->childB, objectMatrices, objectMaterials,objectTypes, objectDatas,
            csg_types, csg_values, csg_objectDatasIndices);

        csg_types.push_back(csg_actuel->getType());

        int value = csg_actuel->value;
        csg_values.push_back(value);

    }
    /*
    Parcourir CSG de facon reccursive
    en faisant childA puis childB quand le type est different de isObject
    Remplir la liste csg_types et csg_values de la facon suivante :
    Si csg est isObject
        //On est dans une feuille qui n'a qu'un Object
        Ajout Type copie du CSG actuel et la Value a ajouter correspondra a l'indice de l'objet du CSG actuel par rapport a la liste objMatrices
        Ajout des infos de l'object aux listes objectMatrics, objectMaterials, objectTypes et objectDatas
    Sinon
        //On est dans une branche normale qui propose une operation
        Parcourt Enfant A, Parcourt Enfant B, Ajout Type et Value actuel a leurs listes correspondantes
    
    [Type] correspond litteralement au type du CSG dans sa classe
    [Value] correspond litteralement a la value du CSG, mais, 
    si le csg isObject, value = la taille du objectMatrices, ce qui est l'objet actuel
    */
}