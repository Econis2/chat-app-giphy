import {
    ILogger, IConfigurationModify, IRead, IHttp, IConfigurationExtend, IEnvironmentRead, IModify, IPersistence,
} from '@rocket.chat/apps-engine/definition/accessors';
import { App } from '@rocket.chat/apps-engine/definition/App';
import { IAppInfo } from '@rocket.chat/apps-engine/definition/metadata';
import { ISetting, SettingType } from '@rocket.chat/apps-engine/definition/settings';
import { ISlashCommand, SlashCommandContext, ISlashCommandPreviewItem,ISlashCommandPreview, SlashCommandPreviewItemType } from '@rocket.chat/apps-engine/definition/slashcommands';

export class GiphyApp extends App {

    giphyApiUrl: string
    giphyApiKey: any
    resultDisplayLimit: number
    resultLimit: number
    apiKeySettingId: string

    constructor(info: IAppInfo, logger: ILogger) {
        super(info, logger);
        this.giphyApiUrl = "https://api.giphy.com/v1/gifs/search"
        this.resultLimit = 50
        this.resultDisplayLimit = 5
        this.giphyApiKey = ""
    }

    public async extendConfiguration( configuration: IConfigurationExtend, environmentRead: IEnvironmentRead): Promise<void> {

        // provides the api key input for the settings in the app
        configuration.settings.provideSetting({
            id: "api_key",
            type: SettingType.STRING,
            packageValue: '',
            required: true,
            public: false,
            i18nLabel: 'Giphy Api Key',
            i18nDescription: 'The api key that giphy has provided'

        })

        // number of returned results
        configuration.settings.provideSetting({
            id: "result_limit",
            type: SettingType.NUMBER,
            packageValue: '',
            required: true,
            public: false,
            i18nLabel: 'Maximum Pulled Gifs',
            i18nDescription: 'Total number of gifs per request'

        })

        configuration.settings.provideSetting({
            id: "result_display_limit",
            type: SettingType.NUMBER,
            packageValue: '',
            required: true,
            public: false,
            i18nLabel: 'Preview Display Amount',
            i18nDescription: 'The number of results returned in a preview'

        })

        configuration.slashCommands.provideSlashCommand(new GiphySlashCommand(this))


    }

    // When someone changes a setting
    public async onSettingUpdated( setting: ISetting, configurationModify: IConfigurationModify, read: IRead, http: IHttp): Promise<void>{

        this.giphyApiKey = await read.getEnvironmentReader().getSettings().getValueById("api_key")
        this.resultLimit = await read.getEnvironmentReader().getSettings().getValueById("result_limit")
        
        if( this.giphyApiKey !== "" ){
            console.log("key: " + this.giphyApiKey + " URL: " + this.giphyApiUrl)

            let response = await http.get( this.giphyApiUrl + "?api_key=" + this.giphyApiKey + "&limit=1&q=test")

            if(response.data.data == null || response.data.data == undefined){
                throw new Error("Error: " + response)
        
            }
        }
        else{ throw new Error("API Key is Blank")}

    }



}

class GiphySlashCommand implements ISlashCommand {

    command: string
    i18nParamsExample: string
    i18nDescription: string
    selected_gif_url: string
    providesPreview: boolean

    constructor(private readonly app: GiphyApp){
        this.command = "giphy"
        this.i18nParamsExample = ""
        this.i18nDescription = "Get your giphy on"
        this.providesPreview = true
    }


    // show the result limit preview
    public async executePreviewItem( item: ISlashCommandPreviewItem, context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence ): Promise<void> {
        //Do Stuff
        
        let message_builder = modify.getCreator().startMessage()

        message_builder.setSender(context.getSender()).setRoom(context.getRoom())

        let response = await http.get( "https://api.giphy.com/v1/gifs/" + item.id + "?api_key=" + this.app.giphyApiKey)

        message_builder.addAttachment({
            imageUrl: response.data.data.images.original.url
        })
        
        await modify.getCreator().finish(message_builder)

    }

    public async previewer(  context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence ): Promise<ISlashCommandPreview> {
        //Do Stuff
        let items: Array<ISlashCommandPreviewItem> = []

        let raw_args = await context.getArguments()
        let args = raw_args.join("+")

        console.log(args)

        let response = await http.get( this.app.giphyApiUrl + "?api_key=" + this.app.giphyApiKey + "&limit=" + this.app.resultLimit + "&q=" + args )
        
        let gif_pool: any[] = [] 
        
        response!.data!.data!.map((item: any) =>{
            gif_pool.push({
                id: item.id,
                title: item.title,
                preview_url: item.images.fixed_height_small.url,
                orig_url: item.images.original.url
            })
        })

        let numberTracker: number[] = []

        for( let x: number = 0; x < this.app.resultDisplayLimit; x ++){

            let randomNumber = Math.floor(Math.random() * this.app.resultLimit)
            
            while ( numberTracker.indexOf(randomNumber) != -1 ){
                randomNumber = Math.floor(Math.random() * this.app.resultLimit)
            }

            numberTracker.push(randomNumber)
            
            items.push({
                id: gif_pool[randomNumber].id,
                type: SlashCommandPreviewItemType.IMAGE,
                value: gif_pool[randomNumber].preview_url
            })

        }
        
        return {
            i18nTitle: "Choose your gif...",
            items
        }


    }

    // Post selected to channel
    public async executor( context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence ): Promise<void> {

        // Do Stuff

    }

}

