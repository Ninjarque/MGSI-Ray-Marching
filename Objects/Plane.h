#include "glm/glm.hpp"
#include "glm/gtc/matrix_transform.hpp"
using namespace glm;

#include <vector>

#include "../Object.h"

class Plane : public Object
{
public:
    vec3 normale;

    Plane(vec3 pos, vec3 normale, Material& material) : Object(pos, vec3(0.0f), vec3(1.0f), material)
    {
        this->normale = normale;
    }

    //Retourne le type sous forme d'int et rempli le tableau de donnees suivant
    //les informations necessaire a l'affichage de ce type d'objet precis
    //les autres informations comme la position ou le materiel sont deja traitees ailleurs
    virtual int getTypeData(std::vector<float>& data) override {
        data.push_back(normale.x);
        data.push_back(normale.y);
        data.push_back(normale.z);
        return Object::ObjectType::Plane;
    }
};
