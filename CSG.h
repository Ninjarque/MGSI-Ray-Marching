#ifndef CSG_H
#define CSG_H

#include "glm/glm.hpp"
#include "glm/gtc/matrix_transform.hpp"
using namespace glm;

#include "Object.h"

class CSG
{
  //L'arbre CSG peut avoir deux types, les feuilles et les branches
  //Les feuilles son des arbres n'ayant qu'un objet
  //Et les branches possèdent deux sous arbre CSG et un type d'operation a effectuer
public:
    enum Type {
        Obj = 10,
        Union = 1,
        Difference = 2,
        Intersection = 3
    };

    CSG* childA = nullptr;
    CSG* childB = nullptr;

    Object* object = nullptr;

    Type type;
    float value;

    CSG() { }
    CSG(CSG* chA, CSG* chB, Type type, float value)
    {
        childA = chA;
        childB = chB;
        this->type = type;
        this->value = value;
    }
    CSG(Object* obj)
    {
        object = obj;
        this->type = Type::Obj;
    }
    ~CSG()
    {
        if (type != Type::Obj)
        {
            delete childA;
            delete childB;
        }
        else
        {
            delete object;
        }
    }

    Type getType() { return type; }
    bool isObject() { return type == Type::Obj; }
};

#endif