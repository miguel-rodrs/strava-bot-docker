import cache from './cache.js';
import axios from 'axios';
import {EmbedBuilder} from 'discord.js';

const getAccessToken = async () => {
    const headers = {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json'
    }

    const body = JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        refresh_token: process.env.STRAVA_REFRESH_KEY,
        grant_type: "refresh_token",
    })

    const reauthorizeResponse = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers,
        body,
    })

    const result = reauthorizeResponse

    const chunks = [];
    for await (const chunk of result.body) {
        chunks.push(chunk);
    }
    const res_body = Buffer.concat(chunks).toString();
    const parsedBody = JSON.parse(res_body);

    const access = parsedBody["access_token"];

    return access
}


export const detectStravaLastActivity = async () => {
    const lastActivityString = cache.get('lastActivityString', null) || 'No activities' 
    console.log('Last Activity: '+cache.get('lastActivityString', null))

    const accessToken = await getAccessToken()

    axios.get('https://www.strava.com/api/v3/clubs/'+process.env.STRAVA_CLUB_ID+'/activities?page=1&per_page=1', {
        headers: {
            'Authorization': 'Bearer '+accessToken
        }
    }).then((response) => {

        const data = response.data

        const activityName = data[0].name
        const athlete = data[0].athlete.firstname+' '+data[0].athlete.lastname
        const dist = Number((data[0].distance/1609.34).toFixed(2))
        const seconds = data[0].moving_time
        const secondsTot = data[0].elapsed_time
        let duration = 0
        if(seconds > 3600) {
        const hours = Math.trunc(seconds/3600)
        const minutes = ((seconds%3600)/60).toFixed(0)
        duration = hours+' Hr '+minutes+' Min'
        } else {
        const minutes =(seconds/60).toFixed(0)
        duration = minutes+' Min'
        }
        let durationTot = 0
        if(secondsTot > 3600) {
        const hoursTot = Math.trunc(secondsTot/3600)
        const minutesTot = ((secondsTot%3600)/60).toFixed(0)
        durationTot = hoursTot+' Hr '+minutesTot+' Min'
        } else {
        const minutesTot = (seconds/60).toFixed(0)
        durationTot = minutesTot+' Min'
        }

        const activityString = 'ATHL:'+athlete+'-DIST:'+dist+'-TIME:'+seconds
        cache.set('lastActivityString', activityString)
        if(lastActivityString === activityString) {
            console.log('Last Activity String: '+lastActivityString);
            console.log('No New Activites');
        } else {
            const speed = (dist/(seconds/3600)).toFixed(1)
            const paceRaw = (seconds/dist)
            const paceMin = Math.trunc(paceRaw/60)
            let paceSec = (((paceRaw/60)%paceMin)*60).toFixed(0)
        if(paceSec < 10) {
            paceSec = paceSec.toString().padStart(2, '0')
        }
        const pace = paceMin+':'+paceSec

        const activity = data[0].sport_type

        let message
        let exampleEmbed

        if(activity === 'Ride') {
            message = athlete+' just completed a '+dist+' mile '+activity.toLowerCase()+'!'

            // inside a command, event listener, etc.
            exampleEmbed = new EmbedBuilder()
            .setColor('#5563fa')
            .setTitle(activityName)
            .setDescription(message)
            .addFields(
                { name: 'Distance', value: (dist * 1,609)+' KMs', inline: true },
                { name: 'Time', value: duration, inline: true },
                { name: 'Avg Speed', value: (speed * 1,609)+' KMH', inline: true },
            )
            .setThumbnail('https://asweinrich.dev/media/WAVERUNNERS.png')         
            .setTimestamp()
            .setFooter({ text: 'MLC Wave Runners' , iconURL: 'https://asweinrich.dev/media/WAVERUNNERS.png'});
        } else if(activity === 'Run') {

            message = athlete+' just completed a '+dist+' mile '+activity.toLowerCase()+'!'

            // inside a command, event listener, etc.
            exampleEmbed = new EmbedBuilder()
            .setColor('#77c471')
            .setTitle(activityName)
            .setDescription(message)
            .addFields(
                { name: 'Distance', value: (dist * 1,609)+' KMs', inline: true },
                { name: 'Time', value: duration, inline: true },
                { name: 'Avg Pace', value: (pace * 0.621371)+' per mile', inline: true },
            )
            .setThumbnail('https://asweinrich.dev/media/WAVERUNNERS.png')          
            .setTimestamp()
            .setFooter({ text: 'MLC Wave Runners' , iconURL: 'https://asweinrich.dev/media/WAVERUNNERS.png' });
        } else {

            message = athlete+' just completed a '+durationTot+' '+activity.toLowerCase()+' session!'

            // inside a command, event listener, etc.
            exampleEmbed = new EmbedBuilder()
            .setColor('#aa0000')
            .setTitle(activityName)
            .setDescription(message)
            .addFields(
                { name: 'Distance', value: (dist * 1,609)+' KMs', inline: true },
                { name: 'Time', value: durationTot, inline: true },
            )
            .setThumbnail('https://asweinrich.dev/media/WAVERUNNERS.png')          
            .setTimestamp()
            .setFooter({ text: 'MLC Wave Runners' , iconURL: 'https://asweinrich.dev/media/WAVERUNNERS.png' });
        }
        return {embeds: [exampleEmbed]};
        }
        
    }).catch((error) => {
        console.error(error);
    });
}