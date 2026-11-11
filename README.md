# Pıtır · Bebek Takip Asistanı

Doğumdan okul öncesine kadar bebeğin beslenme, uyku, sağlık ve gelişimini tek yerde izleyen; kayıtları yorumlayıp öneri veren, telefon ve tablette çalışan bir web uygulaması (PWA).

## Özellikler

| Alan | İçerik |
|---|---|
| **Günlük takip** | Emzirme (sol/sağ sayaç), biberon, ek gıda, süt sağma, uyku sayacı, bez (renk/kıvam), ateş, ilaç (doz aralığı uyarısı), belirti, bakım, aktivite, not |
| **Sağlık** | T.C. Sağlık Bakanlığı aşı takvimi + özel aşılar, sağlam çocuk izlemleri ve randevular, WHO persentil eğrileri (kilo/boy/baş çevresi, prematüre düzeltmesi), takviye takibi, alerjiler, diş şeması, krem ve ürünler, acil rehber, yazdırılabilir doktor raporu |
| **Beslenme** | Besin kataloğu, 3 gün kuralı, alerjen tanıştırma durumu, yasaklı besinler, gıda güvenliği, yaşa ve alerjilere göre filtrelenen 28 tarif |
| **Gelişim & uyku** | Gelişim basamakları, gelişim atakları, yaşa göre uyku planı ve kişisel uyku penceresi tahmini, uyku sesleri, oyun ve ebeveyn rehberi |
| **Uyku tahmini** | Bebeğin son günlerdeki kendi düzeninden (uyanıklık aralıkları, uyku süreleri, yatış ve uyanış saatleri) öğrenip yaş normlarıyla harmanlar; günün kalan uykularını, yatış saatini ve uyanma saatini tahmin eder, kısa/kaçan uykuya göre planı günceller |
| **Analiz** | 7/14/30 günlük grafikler, yaş normlarıyla karşılaştırma |
| **Asistan** | Cihazda çalışan kural tabanlı analiz motoru + isteğe bağlı Claude destekli sohbet (pediatri, çocuk gelişimi, diyetisyen ve gıda güvenliği bakışıyla, bebeğin verilerine göre) |

Ayrıca: birden fazla bebek, koyu tema, çevrimdışı çalışma, JSON yedek / CSV dışa aktarım.

## Çalıştırma

Derleme adımı yoktur; statik dosyalardır.

```bash
python3 -m http.server 8000   # http://localhost:8000
```

GitHub Pages gibi herhangi bir statik barındırmada doğrudan çalışır. Telefonda tarayıcıdan açıp **Ana Ekrana Ekle** ile uygulama gibi kullanılır.

## Yapay zekâ

Anahtar olmadan asistan, yerleşik analiz motoruyla yanıt verir. Serbest sohbet için **Ayarlar → Yapay Zekâ** bölümüne bir Anthropic API anahtarı girilir; anahtar yalnızca cihazda saklanır ve istekler tarayıcıdan doğrudan Anthropic'e gider.

> Mağaza sürümünde anahtar uygulamaya gömülmemelidir. İstekleri kendi sunucunuz üzerinden geçirin ve adresini aynı ekrandaki "vekil sunucu" alanına yazın (sunucu `POST /v1/messages` isteğini anahtarı ekleyerek iletir).

## Yapı

```
index.html, manifest.webmanifest, sw.js
css/app.css            tasarım sistemi (açık/koyu tema, telefon + tablet)
js/app.js              kabuk: yönlendirme, menü, ilk kurulum
js/store.js            veri katmanı (localStorage)
js/types.js            kayıt türleri ve form tanımları
js/calc.js             türetilmiş hesaplar
js/predict.js          uyku ve beslenme tahmin motoru
js/insights.js         akıllı analiz kuralları
js/icons.js            çizgi ikon seti
js/ai.js               Claude bağlantısı, bağlam üretimi, çevrimdışı yanıtlar
js/data/               bilgi tabanı (sağlık, gelişim, beslenme)
js/views/              ekranlar
```

Yeni dosya eklendiğinde `sw.js` içindeki `ASSETS` listesine eklenmeli ve `CACHE` sürümü artırılmalıdır.

## App Store / Google Play

Kod tabanı [Capacitor](https://capacitorjs.com) ile sarılarak yerel uygulamaya dönüştürülebilir. Yayın öncesi gerekenler: AI için sunucu tarafı vekil, bulut eşitleme/hesap sistemi, yerel bildirimler, gizlilik politikası ve tıbbi içeriğin bir çocuk hekimi tarafından gözden geçirilmesi.

## Uyarı

Uygulama bilgilendirme amaçlıdır; tıbbi tanı, tedavi veya profesyonel sağlık hizmetinin yerini tutmaz. Referans değerler (WHO büyüme standartları, aşı takvimi, uyku ve beslenme aralıkları) genel kılavuzlardan derlenmiştir ve yayın öncesi uzman doğrulamasından geçirilmelidir.
