# WebRTC-Demo


## Requisitos:

- Node.js v8+
- npm v6 (viene instalado con Node.js)
- Chrome o Firefox
- Windows/Mac OS/Linux

### Live Demo

[Live Demo en AruLearning.com](https://app.arulearning.com)

(Entrar en dos computadoras o dos pestañas)

## Para correr localmente

### Instalar NodeJS

### Descargar la version de NodeJS para su sistema operativo

[https://nodejs.org/en/download/](https://nodejs.org/en/download/)


Seguir las instrucciones de instalacion y comprobar la version de node js instalada

En la terminal: 
```
node --version    # Si sale mayor a 8.0, continuar
npm --version     # Si sale mayor a 6.0, continuar
```

### Clonar el repo e Instalar las dependencias del proyecto, y correr


En la terminal:

```
git clone https://github.com/FrancoRivera/WebRTC-Demo # Clona el repositorio
cd WebRTC-Demo  # Navega a la carpeta clonada
npm install     # Instala las dependencias 
node index.js   # Corre el servidor de desarrollo en localhost:8089
```

(Ctrl-C para parar la ejecucion del script)

![](gif/instalar-node.gif)



### Iniciar la videollamada

Abrir Chrome a localhost:8089, en 2 ventanas o pestañas


## Inspiracion/Basado En:


Siguiendo el tutorial base de Google CodeLabs

[Codelab webRTC](https://codelabs.developers.google.com/codelabs/webrtc-web/#0)



Repo Sample Code:

[GoogleCodeLabs/WebRTC-web](https://github.com/googlecodelabs/webrtc-web)


### Configuracion del servidor TURN

Utilizando COTURN:

[COTURN wiki](https://github.com/coturn/coturn/wiki/CoturnConfig)


