const { Router } = require('express');
// Importar todos los routers;
// Ejemplo: const authRouter = require('./auth.js');
const axios = require('axios');
const router = Router();
const {Types, Pokemon, pokemon_types}= require('../db');
const { v4: uuidv4 } = require('uuid');

// Configurar los routers
// Ejemplo: router.use('/auth', authRouter);

//--------------------------------Trae la info de la api---------------------------------------
const getApiInfo = async() =>{    //va a llamar al endpoint de la api y me va a traer toda la info que va a necesitar
    // const apiUrl = await axios.get('https://pokeapi.co/api/v2/pokemon') //genero un mapeo para que me devuelva solo lo que yo necesito traerme desde el back para mi aplicación 
    // console.log(apiUrl)
    let apiUrl = await axios.get("https://pokeapi.co/api/v2/pokemon?offset=0&limit=22")
            .then((res) => {
                return res.data.results
            })
            .then((results) => {
                return Promise.all(results.map((res) => axios.get(res.url)))
            })
            .then((results) => {                
                return results.map((res) => {
                    return {
                        name: res.data.name,
                        id: res.data.id,
                        img: res.data.sprites.other.dream_world.front_default,
                        type: res.data.types.map( (elem) => elem.type.name),
                    }
                } )
            })
    return apiUrl;
};

// const apiInfo = await apiUrl.data.map(el =>{  
    //     return{
    //         name: el.results.map(el => el.name),
    //         id: el.results.map(el => el.url).id,
    //         attack: el.results.map(el => el.url.stats(el => el.stat.name)),

    //         image: el.results.map(el => el.url),
    //         types: el.results.map(el => el.url.types(el => el.type.url.damage_relations)),
            

    //         occupation: el.occupation.map(el => el),
    //         appearance: el.appearance.map(el => el),
    //     };
        
    // });

//-----------------------------Trae la info de la Db-----------------------------------------
const getDbInfo = async () => {
    return await Pokemon.findAll({
        include:{
            model: Types,
            attibutes: ['name'],
            through: {  //va siempre, es la comprobación cuando me quiero traer un atributo
                attributes: [],
            },
        }
    });
}

//-----------------------------concateno info de la api y la db-------------------------------------
const getAllCharacters = async () =>{
    const apiInfo = await getApiInfo();
    const dbInfo = await getDbInfo();
    const infoTotal = apiInfo.concat(dbInfo);
    return infoTotal
}
//desde el front tengo el input de búsqueda que trae esta ruta por query
router.get('/pokemon', async (req,res)=>{
    const name= req.query.name
    let charactersTotal = await getAllCharacters();//trae lo que se concatenó
    if(name){ //si hay un nombre que me pasan por query hago ...
        let characterName = await charactersTotal.filter(el => el.name.toLowerCase().includes(name.toLowerCase()))
        characterName.length ? //¿encontraste algo acá?
        res.status(200).send(characterName) : 
        res.status(400).send('El personaje no está');
    }else{
        //si no hay un query 
        res.status(200).send(charactersTotal)
    };
});
//-----------Obtengo las ocupaciones desde la api externa, luego las guardo en la Base de datos y las empiezo a utilzar desde allí------------------------------
router.get('/types', async (req, res) => {
   const getAll = Types.findAll() //traer de la api
   try{if(getAll){
            return res.status(200).send(getAll)
        }else{//de la api llevarlo a la db
            return res.status(400).send('No se encontró nada en tipos')
        }//de la db trabajar con eso, mostrarlo
   }catch(err){
    console.log(err)
   }
});


//Recibo los datos del formulario desde la ruta de creación del personaje por body//crea un nuevo personaje en la base de datos.
router.post('/pokemon', async(req, res)=>{ //lo que me llega por body
        try{
            let{
                name,
                nickname,
                birthday,
                image, 
                status,
                createInDb,    
                occupation
            } = req.body
            console.log(req.body)
            let characterCreated = await Pokemon.create({ //Creo el personaje
            id: uuidv4(),
            name,
            nickname,
            birthday,
            image,
            status,
            createInDb
            //no me traigo la occupacion porque tengo que hacer la relación a parte.
            }) 
            //Acá recién me lo traigo del modelo de ocupación porque así se hizo el PI
            await characterCreated.addOccupation(occupation) //eL 'addOccupation' es un método de sequelize,  lo que hace es traerme de la tabla occupations lo que se pasa por paréntesis.
            // const occupationDb = await Types.findAll({
            //     where: {name : occupation} //que name sea igual al occupation que me llega por body
            // })
            
            return res.json(characterCreated)
        }catch(error){
            console.log(error)
            return res.status(500).json({error: 'No se pudo crear el personaje'})
        }
});

router.get('/characters/:id', async (req,res) =>{
    const id = req.params.id;
    const charactersTotal = await getAllCharacters();
    if(id){
        let characterId = await charactersTotal.filter(el => el.id == id)
        characterId.length?
        res.status(200).json(characterId) :
        res.status(404).send('No encontré ese personaje')
    }
})

//--------------------------------------------------------------------------------------------------------------------
module.exports = router;

