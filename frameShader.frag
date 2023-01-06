#version 140

uniform sampler2D currentFrame;  // The texture  (we'll bind to texture unit 0)
uniform sampler2D newFrame;   // The bump-map (we'll bind to texture unit 1)

uniform float keep;
uniform float time;
uniform int steps;

out vec4 FragColor;
  
in vec2 TexCoords;

float sigmoid(float x)
{
    return 1.0 / (1.0 + exp(-x));
}

void main()
{ 
    vec4 currentColor = texture(currentFrame, TexCoords);
    vec4 newColor = texture(newFrame, TexCoords);

    if (keep == 0.0)
    {
        FragColor = newColor;
        return;
    }

    float realKeep = keep * sigmoid(pow(steps / 10.0, 1.0));
    FragColor = //currentColor + (newColor - currentColor) / steps;
                newColor * (1 - realKeep) + currentColor * realKeep;
}