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

    float realKeep = keep * sigmoid(pow(time, 0.3));
    FragColor = //currentColor + (newColor - currentColor) / steps;
                newColor * (1 - realKeep) + currentColor * realKeep;
}