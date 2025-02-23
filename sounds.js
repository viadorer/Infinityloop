class SoundManager {
    constructor() {
        this.sounds = {
            thrust: new Audio('https://assets.mixkit.co/active_storage/sfx/2357/2357-preview.mp3'),
            collect: new Audio('https://assets.mixkit.co/active_storage/sfx/1345/1345-preview.mp3'),
            explosion: new Audio('https://assets.mixkit.co/active_storage/sfx/1701/1701-preview.mp3'),
            shoot: new Audio('https://assets.mixkit.co/active_storage/sfx/1678/1678-preview.mp3'),
            powerup: new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3')
        };

        // Nastavení hlasitosti
        Object.values(this.sounds).forEach(sound => {
            sound.volume = 0.3;
        });
    }

    play(soundName) {
        const sound = this.sounds[soundName];
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(e => console.log('Zvuk se nepodařilo přehrát:', e));
        }
    }
}
