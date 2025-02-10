let imageLib:ImageLibrary;

import axios from 'axios';
import { gCurrentLang } from './lang';

export default class ImageLibrary {

    static BASE_URL = "https://api.arasaac.org/api";

    static get() {
        return imageLib;
    }

    async search(keyword: string) {
        const locale = gCurrentLang.substring(0, 2);
        const searchPath = `/pictograms/${locale}/search/${keyword}`
        return axios.get(ImageLibrary.BASE_URL + searchPath).then(
            (res) => {
                //console.log(res)
                return res.data.
                    filter((item: any) => (!item.violence)).
                    map((item: any) => ({
                        id: item._id,
                        url: `${ImageLibrary.BASE_URL}/pictograms/${item._id}?download=false`,
                    }))
            },
            () => ([]))

    }
}

imageLib = new ImageLibrary();


