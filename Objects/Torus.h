#include "glm/glm.hpp"
#include "glm/gtc/matrix_transform.hpp"
using namespace glm;

#include <vector>

#include "../Object.h"

class Torus : public Object
{
public:
    float bigRadius;
    float smallRadius;

    Torus(vec3 pos, float bigRadius, float smallRadius, Material& material) : Object(pos, vec3(0.0f), vec3(1.0f), material)
    {
        this->bigRadius = bigRadius;//informations supplementaire  pour ce type d'objets
        this->smallRadius = smallRadius;//informations supplementaire  pour ce type d'objets
    }

    //Retourne le type sous forme d'int et rempli le tableau de donnees suivant
    //les informations necessaire a l'affichage de ce type d'objet precis
    //les autres informations comme la position ou le materiel sont deja traitees ailleurs
    virtual int getTypeData(std::vector<float>& data) override {
        data.push_back(bigRadius);
        data.push_back(smallRadius);
        return Object::ObjectType::Torus;
    }
};
