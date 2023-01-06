#include "glm/glm.hpp"
#include "glm/gtc/matrix_transform.hpp"
using namespace glm;

#include <vector>

#include "../Object.h"

class Sphere : public Object
{
public:
    float radius;

    Sphere(vec3 pos, float radius, Material& material) : Object(pos, vec3(0.0f), vec3(1.0f), material)
    {
        this->radius = radius;//informations supplementaire  pour ce type d'objets
    }

    //Retourne le type sous forme d'int et rempli le tableau de donnees suivant
    //les informations necessaire a l'affichage de ce type d'objet precis
    //les autres informations comme la position ou le materiel sont deja traitees ailleurs
    virtual int getTypeData(std::vector<float>& data) override {
        data.push_back(radius);
        return Object::ObjectType::Sphere;
    }
};
