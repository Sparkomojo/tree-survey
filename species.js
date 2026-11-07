// Tree Survey – © 2026 Mark Johnson. All rights reserved. Use only under a written licence from the owner.
// Species pick-list: "Botanical - Common" (the format the report builders split on).
// Anything typed that isn't in the list is kept exactly as typed.
const SPECIES = `Abies alba - Silver fir
Abies amabilis - Pacific silver fir
Abies borisii-regis - King boris's fir
Abies bornmuellerana - Bornmullers fir
Abies bracteata - Santa lucia fir
Abies cephalonica - Grecian fir
Abies cilicica - Cilician fir
Abies concolor - White fir
Abies fargesii - Sutchuen fir
Abies firma - Momi fir
Abies forrestii - Forrest's fir
Abies grandis - Grand fir
Abies holophylla - Manchurian fir
Abies homolepis - Nikko fir
Abies koreana - Korean fir
Abies lasiocarpa - Alpine fir
Abies magnifica - Red fir
Abies mariesii - Maries's fir
Abies nephrolepis - East siberian fir
Abies nordmanniana - Caucasian fir
Abies numidica - Algerian fir
Abies pindrow - Pindrow fir
Abies pinsapo - Spanish fir
Abies procera - Noble fir
Abies recurva - Min fir
Abies sachalinensis - Sakhalin fir
Abies sibirica - Siberian fir
Abies sp. - Fir
Abies spectablis - Himalayan fir
Abies veitchii - Veitch's silver fir
Acacia dealbata - Silver Wattle / Mimosa
Acacia sp. - Acacia
Acer argutum - Deep-veined maple
Acer buergeranum - Trident maple
Acer campestre - Field maple
Acer capillipes - Red snakebark maple
Acer cappadocicum - Cappadocian maple
Acer carpinifolium - Hornbeam maple
Acer cissifolium - Vine leafed maple
Acer crataegifolium - Hawthorn-leafed maple
Acer davidii - Pere David's maple
Acer diabolicum - Horned maple
Acer distylum - Lime-leaved maple
Acer forrestii - Forrest's maple
Acer ginnala - Amur maple
Acer griseum - Paperbark maple
Acer heldreichii - Heldreich's maple
Acer hersii - Hers's maple
Acer hyrcanum - Balkan maple
Acer japonicum - Full moon maple
Acer lobelii - Lobel's maple
Acer macrophyllum - Oregon maple
Acer miyabei - Miyabe's maple
Acer monspessulanum - Montpelier maple
Acer negundo - Box elder maple
Acer nikoense - Nikko maple
Acer opalus - Italian maple
Acer ozakazuki - Maple 'Ozakazuki'
Acer palmatum 'Atropurpureum' - Purple maple
Acer palmatum 'Senkaki' - Coral-bark 'Senkaki'
Acer palmatum - Japanese maple
Acer pensylvanicum - Striped maple
Acer platanoides 'Crimson King' - Purple norway maple
Acer platanoides 'Schwedleri' - Maple 'Schwedleri'
Acer platanoides - Norway maple
Acer pseudoplatanus 'Brilliantissimum' - Maple 'Brilliantissimum'
Acer pseudoplatanus - Sycamore
Acer pseudosieboldianum - Korean maple
Acer rubrum - Red maple
Acer rufinerve - Snakebark maple (redvein)
Acer saccharinum - Silver maple
Acer saccharum - Sugar maple
Acer sempervirens - Cretan maple
Acer sp. (various) - Snakebark maple
Acer sp. - Maple
Acer tataricum - Tartar maple
Acer tetramerum - Birch-leaf maple
Acer trautvetteri - Trautvetter's maple
Acer triflorum - Rough barked maple
Acer velutinum - Van volxem's maple
Acer x freemanii - Freeman maple
Acer zoeschense - Zoeschen maple
Aesculus carnea 'Briotii' - Red horse chestnut 'Briotii'
Aesculus flava - Yellow buckeye
Aesculus hippocastanum - Horse chestnut
Aesculus hybrida - Hybrid buckeye
Aesculus indica - Indian horse chestnut
Aesculus neglecta - Sunrise horse chestnut
Aesculus pavia - Red buckeye
Aesculus sp. - Chestnut/buckeye
Aesculus turbinata - Japanese horse chestnut
Aesculus x carnea - Red horse chestnut
Ailanthus altissima - Tree of heaven
Ailanthus vilmoriniana - Downy tree of heaven
Albizia julibrissin - Persian silk tree
Alnus alnobetula - Green alder
Alnus cordata - Italian alder
Alnus glutinosa - Common alder
Alnus incana - Grey alder
Alnus japonica - Japanese alder
Alnus rubra - Red alder
Alnus sp. - Alder
Alnus spaethii - Spaeth alder
Amelanchier arborea - Downy serviceberry
Amelanchier laevis - Serviceberry
Amelanchier lamarckii - Snowy mespilus
Amelanchier sp. - Amelanchier
Aralia spinosa - Devils walking stick
Araucaria araucana - Monkey puzzle
Araucaria heterophylla - Norfolk island pine
Arbutus andrachne - Cyprus strawberry tree
Arbutus andrachnoides - Hybrid strawberry tree
Arbutus menziesii - Pacific madrone
Arbutus sp. - Arbutus
Arbutus unedo - Strawberry tree
Ardisia quinquegona - Incense Tree
Aria edulis 'Lutescens' - Sorbus 'Lutescens'
Aria edulis 'Majestica' - Sorbus 'Majestica'
Aria edulis 'Wilfred Fox' - Sorbus 'Wilfred Fox'
Aria edulis - Whitebeam
Athrotaxis laxifolia - Summit cedar
Aucuba Japonica - Japanese laurel
Aucuba japonica variegated varieties - Spotted laurel
Austrocedrus chilensis - Chilean incense cedar
Bambusa sp. - Bamboo
Berberis sp. - Berberis
Betula alba - Common birch
Betula albosinensis - Chinese red birch
Betula ermanii - Erman's birch
Betula fastigiata - Betula 'Fastigiata'
Betula lenta - Cherry birch
Betula lutea - Yellow birch
Betula maximowicziana - Monarch birch
Betula medwediewii - Transcaucasian birch
Betula nigra - River birch
Betula papyrifera - Paper birch
Betula pendula - Silver birch
Betula pendula ‘Dalecarlica’ - Swedish birch
Betula platyphylla - Szechuan birch
Betula pubescens - Downy birch
Betula sp. - Birch
Betula utilis 'Jacquemontii' - West Himalayan birch
Betula utilis - Himalayan birch
Betula utilis var. jacquemontii - Himalayan birch
Betula youngii - Birch 'Youngii'
Broussonetia papyrifera - Paper mulberry
Buddleia sp. - Buddleia
Buddleja davidii - Butterfly bush
Buddleja sp. - Buddleja
Buxus balearica - Balearic box
Buxus sempervirens - Box
Buxus sp. - Box
Callitropsis nootkatensis - Nootka cypress
Calocedrus decurrens - Incense cedar
Calycanthus floridus - Carolina allspice
Carpinus betulus 'Fastigiata' - Hornbeam 'Fastigiata'
Carpinus betulus - Hornbeam
Carpinus japonica - Japanese hornbeam
Carpinus orientalis - Oriental hornbeam
Carya cordiformis - Bitternut
Carya glabra - Pignut
Carya illinoinensis - Pecan
Carya laciniosa - Big shelllbark hickory
Carya ovata - Shagbark hickory
Carya tomentosa - Mockernut
Castanea sativa 'Aureomarginata' - Variegated chestnut
Castanea sativa 'Laciniata' - Cut leaved chestnut
Castanea sativa - Sweet chestnut
Catalpa bignonioides - Indian bean tree
Catalpa erubescens - Hybrid bean tree
Catalpa fargesii - Fafge's bean tree
Catalpa ovata - Yellow catalpa
Catalpa sp. - Catalpa
Catalpa speciosa - Northern catalpa
Cedrela chinensis - Chinese cedar
Cedrus atlantica - Atlas cedar
Cedrus atlantica glauca - Blue cedar
Cedrus brevifolia - Cyprus cedar
Cedrus Climbupus - My cedar
Cedrus deodara - Deodar cedar
Cedrus libani - Cedar of Lebanon
Cedrus sp. - Cedar
Celtis australis - Nettle tree
Celtis occidentalis - Hackberry
Cephalotaxus fortuni - Chinese cowtail pine
Cephalotaxus harrigtonia 'Fastigiata' - Japanese cowtail pine (upright form)
Cephalotaxus harringtonia - Japanese cowtail pine
Cercidiphyllum japonicum - Katsura tree
Cercis siliquastrum - Judas tree
Cercis sp. - Cercis
Chamaecyparis formosensis - Formosan cypress
Chamaecyparis lawsoniana 'Allumii' - Lawson cypress 'Allumii'
Chamaecyparis lawsoniana 'Columnaris' - Lawson cypress 'Columnaris'
Chamaecyparis lawsoniana 'Ellwoodii' - Lawson cypress 'Ellwoodii'
Chamaecyparis lawsoniana 'Erecta' - Lawson cypress 'Erecta'
Chamaecyparis lawsoniana 'Fletcheri' - Lawson cypress 'Fletcheri'
Chamaecyparis lawsoniana 'Fraseri' - Lawson cypress 'Fraserii'
Chamaecyparis lawsoniana 'Green Spire' - Lawson cypress 'Green Spire'
Chamaecyparis lawsoniana 'Intertexta' - Lawson cypress 'Intertexta'
Chamaecyparis lawsoniana 'Lutea' - Lawson cypress 'Lutea'
Chamaecyparis lawsoniana 'Pottenii' - Lawson cypress 'Pottenii'
Chamaecyparis lawsoniana 'Stewartii' - Lawson cypress 'Stewartii'
Chamaecyparis lawsoniana 'Triumph of Boskoop' - Lawson cypress 'Triumph of Boskoop'
Chamaecyparis lawsoniana 'Wisselii' - Lawson cypress 'Wisselii'
Chamaecyparis lawsoniana - Lawson cypress
Chamaecyparis obtusa - Hinoki cypress
Chamaecyparis pisifera - Sawara cypress
Chamaecyparis sp. - False cypress
Chamaecyparis thyoides - Southern white cedar
Chrysolepis chrysophylla - Golden chestnut
Cladrastis kentuckea - Yellow-wood
Cladrastis Lutea - Yellow wood
Clerodendrum trichotomum - Glory tree
Cordyline australis - Cabbage tree
Cornus alba - Red-barked dogwood
Cornus capitata - Bentham's cornel
Cornus controversa - Wedding cake tree
Cornus kousa - Chinese dogwood
Cornus mas - Cornelian cherry
Cornus nuttallii - Pacific dogwood
Cornus sanguinea - Dogwood
Cornus sp. - Dogwood
Corylus avellana 'Contorta' - Corkscrew hazel
Corylus avellana - Hazel
Corylus colurna - Turkish hazel
Corylus maxima 'Purpurea' - Purple hazel
Corylus maxima - Filbert
Corylus sp. - Hazel species
Cotinus coggygria - Smokebush
Cotoneaster frigidus - Himalayan tree-cotoneaster
Cotoneaster simonsii - Himalyan cotoneaster
Cotoneaster spp. - Cotoneaster
Crataegus azarolus - Mediterranean Medlar, Hawthorn
Crataegus crus-galli - Cockspur hawthorn
Crataegus laevigata 'Pauls Scarlet' - Hawthorn 'Pauls Scarlet'
Crataegus laevigata - Midland hawthorn
Crataegus monogyna - Hawthorn
Crataegus oxyacantha - Midland thorn
Crataegus persimilis - Broad-leaved cockspur hawthorn
Crataegus prunifolia - Broadleaf cockspur thorn
Crataegus sp. - Hawthorn
Crataegus x lavalleei - Hybrid cockspur thorn
Crinodendron hookerianum - Chilean lantern tree
Cryptomeria japonica - Japanese cedar
Cunninghamia lanceolata - China fir
Cupressus arizonica - Arizona cypress
Cupressus arizonica var. glabra - Smooth Arizona cypress
Cupressus macrocarpa - Monterey cypress
Cupressus sempervirens - Italian cypress
Cupressus sp. - Cypress
Cupressus x leylandii - Leyland cypress
Cydonia oblonga - Quince
Cytisus battandieri - Pineapple broom
Davidia involucrata - Handkerchief Tree
Diospyros lotus - Date plum
Diospyros virginiana - Persimmon date plum
Drimys winteri - Winter's bark
Drimys winteri winteri - Winters bark
Elaeagnus commutata - Silver berry
Elaeagnus spp. - Elaeagnus
Embothrium coccineum - Chilean fire bush
Eriobotrya japonica - Japanese medlar
Eucalyptus dalrympleana - Broad leaf kindling bark gum
Eucalyptus globulus - Blue gum
Eucalyptus gunnii - Eucalyptus cider gum
Eucalyptus pauciflora - Snow gum
Eucalyptus sp. - Eucalyptus
Eucalyptus urnigera - Urn gum
Eucommia ulmoides - Gutta-percha tree
Eucryphia cordifolia - Eucryphia cordifoia
Eucryphia glutinosa - Eucryphia glutinosa
Eucryphia nymansensis - Nymans hybrid eucryphia
Euodia hupehensis - Bee tree
Euonymus europaeus - Spindle
Fagus englerana - Chinese beech
Fagus orientalis - Oriental beech
Fagus sp. - Beech
Fagus sylvatica 'Asplenifolia' - Cut-leaf beech
Fagus sylvatica 'Dawyck' - Dawyck beech
Fagus sylvatica 'Pendula' - Weeping beech
Fagus sylvatica 'Purpurea' - Copper beech
Fagus sylvatica - European beech
Fagus sylvatica purpurea - Copper beech
Felled - Felled
Ficus carica - Fig
Frangula alnus - Alder buckthorn
Fraxinus americana - American ash
Fraxinus angustifolia - Narrow-leaved ash
Fraxinus angustifolia oxycarpa - Raywood ash
Fraxinus diversifolia - Ash 'Diversifolia'
Fraxinus excelsior 'Jaspidea' - Jaspidea ash
Fraxinus excelsior 'Pendula' - Weeping ash
Fraxinus excelsior - European ash
Fraxinus jaspidea - Ash 'Jaspidea'
Fraxinus latifolia - Oregon ash
Fraxinus mariesii - Chinese flowering ash
Fraxinus ornus - Manna ash
Fraxinus oxycarpa - Caucasian ash
Fraxinus pennsylvanica - Red ash
Fraxinus raywood - Ash 'Raywood'
Fraxinus sp. - Ash
Garrya elliptica - Coast silktassel
Genista aetnensis - Mount etna broom
Ginkgo biloba - Maidenhair tree
Gleditsia inermis - Gleditsia 'Inermis'
Gleditsia sp. - Gleditsia
Gleditsia triacanthos 'Sunburst' - Gleditsia 'Sunburst'
Gleditsia triacanthos - Honey locust
Griselinia littoralis - Kapuka
Griselinia sp. - Griselinia
Gymnocladus dioicus - Kentucky coffeetree
Halesia monticola - Snowdrop tree
Hamamelis virginiana - Witch hazel
Hedera sp. - Ivy
Hippophae rhamnoides - Common sea buckthorn
Hippophae salicifolia - Willow-leaved sea buckthorn
Idesia polycarpa - Idesia
Ilex aquifolium 'Ferox' - Hedgehog holly
Ilex aquifolium - Holly
Ilex dipyrena - Himalayan holly
Ilex pernyi - Perny's holly
Ilex sp. - Holly
Ilex x altaclarensis 'Camelliifolia' - Holly 'Camelliifolia'
Ilex x altaclarensis 'Golden King' - Holly 'Golden King'
Ilex x altaclarensis 'Hodginsii' - Holly 'Hodginsii'
Ilex x altaclarensis 'Lawsoniana' - Holly 'Lawsoniana'
Ilex x altaclarensis 'Wilsonii' - Holly 'Wilsonii'
Ilex x altaclarensis - Golden king holly
Ilex x Koehneana - Chestnut leaf holly
Ilex × altaclerensis - Highclere holly
Juglans ailanthifolia - Japanese walnut
Juglans cinerea - Butternut
Juglans mandschurica - Manchurian walnut
Juglans nigra - Black walnut
Juglans regia - Common walnut
Juglans sp. - Walnut
Juniperus chinensis - Chinese juniper
Juniperus communis - Common juniper
Juniperus drupacea - Syrian juniper
Juniperus recurva - Drooping juniper
Juniperus rigida - Temple juniper
Juniperus sp. - Juniper
Juniperus squamata - Meyers blue juniper
Juniperus virginiana - Eastern red cedar
Kalopanax pictus - Prickly castor oil tree
Koelreuteria paniculata - Pride of India
Laburnocytisus adamii - Adam's laburnum
Laburnum alpinum - Scotch laburnum
Laburnum anagyroides - Laburnum
Laburnum sp. - Laburnum
Laburnum watereri - Voss's laburnum
Larix decidua - European larch
Larix gmelinii - Dahurian larch
Larix griffithii - Sikkim larch
Larix kaempferi - Japanese larch
Larix laricina - Tamarack larch
Larix occidentalis - Western larch
Larix sibirica - Siberian larch
Larix sp. - Larch
Larix x eurolepis - Hybrid larch
Laurus nobilis - Bay tree
Laurus sp. - Laurel
Ligustrum lucidum - Chinese privet
Ligustrum ovalifolium - Privet
Ligustrum sp. - Ligustrum
Ligustrum vulgare - Privet
Liquidambar styraciflua - Sweetgum
Liquidamber formosana - Chinese sweetgum
Liquidamber orientalis - Oriental sweetgum
Liquidamber styraciflua - Sweetgum
Liriodendron chinense - Chinese tulip tree
Liriodendron tulipifera - Tulip tree
Lonicera sp. - Honeysuckle
Maclura pomifera - Osage orange
Magnolia acuminata - Cucumber tree
Magnolia campbellii - Campbell's magnolia
Magnolia delavayi - Chinese evergreen magnolia
Magnolia grandiflora - Evergreen magnolia
Magnolia hypoleuca - Japanese bigleaf magnolia
Magnolia kobus - Northern Japanese magnolia
Magnolia lennei - Saucer magnolia 'Lennei'
Magnolia liliflora - Lily magnolia
Magnolia macrophylla - Bigleaf magnolia
Magnolia salicifolia - Willow-leafed magnolia
Magnolia soulangeana - Tulip magnolia
Magnolia soulangiana - Saucer magnolia
Magnolia spp. - Magnolia
Magnolia stellata - Star magnolia
Magnolia veitchii - Veitch's hybrid magnolia
Malus 'Golden Hornet' - Golden hornet
Malus 'John Downie' - John downie
Malus 'Lemoinei' - Purple crab 'Lemoinei'
Malus 'Magdeburgensis' - Magdeburg
Malus 'Profusion' - Purple crab 'Profusion'
Malus baccata - Siberian crab apple
Malus domestica - Apple
Malus floribunda - Japanese crab apple
Malus halliana - Hall's crab
Malus hupehensis - Hupeh crab
Malus purpurea - Purple crab
Malus spectabilis - Chinese crab
Malus spp. - Ornamental crab apple
Malus sylvestris - Crab apple
Malus tschonoskii - Pillar apple
Mespilus germanica - Medlar
Metasequoia glyptostroboides - Dawn redwood
Morus alba - White mulberry
Morus nigra - Black mulberry
Morus sp. - Mulberry
Myrtus luma - Orange-bark myrtle
Not identified - Not identified
Nothofagus antarctica - Antartic beech
Nothofagus dombeyi - Dombey's southern beech
Nothofagus fusca - Red beech
Nothofagus menziesii - Silver beech
Nothofagus obliqua - Roble beech
Nothofagus procera - Rauli beech
Nothofagus solandri - Black beech
Nothofagus spp. - Southern beech
Nyssa sylvatica - Tupelo
Olea europaea - Olive
Ostrya carpinifolia - European hop-hornbeam
Other - Other
Oxydendrum arboreum - Sorrel tree
Parrotia persica - Persian ironwood
Paulownia sp. - Paulownia
Paulownia tomentosa - Foxglove tree
Phellodendron amurense - Amur cork tree
Phellodendron japonicum - Japanese cork tree
Phillyrea latifolia - Phillyrea
Phoenix canariensis - Canary palm
Photinia davidiana - Photinia davidiana
Photinia sp. - Photinia
Photinia x fraseri - Photinia 'Red Robin'
Picea abies 'Pendula' - Weeping Norway spruce
Picea abies - Norway spruce
Picea abies excelsior - Norway spruce 'Excelsior'
Picea asperata - Dragon spruce
Picea bicolor - Alcock's spruce
Picea brachytyla - Sargent spruce
Picea breweriana - Brewer's weeping spruce
Picea engelmannii - Engelmann spruce
Picea excelsa - Common spruce
Picea glauca - White spruce
Picea jezoensis - Hondo spruce
Picea likiangensis - Likiang spruce
Picea mariana - Black spruce
Picea obovata - Siberian spruce
Picea omorika - Serbian spruce
Picea orientalis - Oriental spruce
Picea polita - Tiger-tail spruce
Picea pungens 'Glauca' - Blue spruce
Picea pungens - Colorado spruce
Picea rubens - Red spruce
Picea schrenkiana - Schrenk's spruce
Picea sitchensis - Sitka spruce
Picea smithiana - Himalayan spruce
Picea sp. - Spruce
Picea spinulosa - Sikkim spruce
Picrasma quassioides - Picrasma
Pieris sp. - Pieris
Pine x 8 - Pine x 8
Pinus aristata - Bristlecone pine
Pinus armandii - Chinese white pine
Pinus attenuata - Knobcone pine
Pinus ayacahuite - Mexican white pine
Pinus balfouriana - Foxtail pine
Pinus banksiana - Jack pine
Pinus brutia - Calabrian pine
Pinus bungeana - Lacebark pine
Pinus cembra - Arolla pine
Pinus contorta - Lodgepole pine
Pinus contorta var contorta - Shore pine
Pinus coulteri - Coulter pine
Pinus densiflora - Japanese red pine
Pinus flexilis - Limber pine
Pinus halepensis - Aleppo pine
Pinus heldreichii - Bosnian pine
Pinus holfordiana - Holford pine
Pinus jeffreyi - Jeffrey pine
Pinus koraiensis - Korean pine
Pinus lambertiana - Sugar pine
Pinus maritima 'Bournemouth' - Bournemouth pine
Pinus maritima - Maritime pine
Pinus montezumae - Montezuma pine
Pinus monticola - Western white pine
Pinus mugo - Mountain pine
Pinus muricata - Bishop pine
Pinus nigra - Black pine
Pinus nigra austriaca - Austrian pine
Pinus nigra laricio - Corsican pine
Pinus nigra subsp. laricio - Corsican pine
Pinus nigra var.caramanica - Crimean pine
Pinus parviflora - Japanese white pine
Pinus patula - Mexican pine
Pinus peuce - Macedonian pine
Pinus pinea 'Umbrella' - Umbrella pine
Pinus pinea - Stone pine
Pinus ponderosa - Ponderos pine
Pinus radiata - Monterey pine
Pinus resinosa - Red pine
Pinus rigida - Northern pitch pine
Pinus sp. - Pine
Pinus strobus - Weymouth pine
Pinus sylvestris - Scots pine
Pinus thunbergii - Japanese black pine
Pinus wallichiana - Bhutan pine
Pittosporum sp. - Pittosporum
Pittosporum tobira - Australian laurel
Platanus orientalis - Oriental plane
Platanus sp. - Plane
Platanus x hispanica 'Pyramidalis' - London plane 'Pyramidalis'
Platanus x hispanica - London plane
Podocarpus andinus - Plum-fruited yew
Podocarpus nubigenus - Chilean totara
Podocarpus salignus - Willow-leaf podocarp
Podocarpus totara - Totara
Populus alba - White poplar
Populus balsamifera - Balsam poplar
Populus berolinensis - Berlin poplar
Populus deltoides - Eastern cottonwood
Populus lasiocarpa - Chinese necklace poplar
Populus nigra 'Italica' - Lombardy poplar
Populus nigra - Black poplar
Populus nigra italica - Lombardy poplar
Populus spp. - Poplar
Populus tremula - Aspen
Populus trichocarpa - Western balsam poplar
Populus x canadensis 'Marilandica' - Railway poplar
Populus x canadensis 'Robusta' - Hybrid poplar 'Robusta'
Populus x canadensis 'Serotina Aurea' - Golden poplar
Populus x canadensis 'Serotina' - Black Italian poplar
Populus x canadensis - Hybrid black poplar
Populus x canescens - Grey poplar
Prunus 'Accolade' - Prunus 'Accolade'
Prunus 'Amanogawa' - Prunus 'Amanogawa'
Prunus 'Cheals Weeping' - Cheal's Weeping cherry
Prunus 'Kanzan' - Prunus 'Kanzan'
Prunus 'Pink Perfection' - Prunus 'Pink Perfection'
Prunus 'Shimidsu' - Prunus 'Shimidsu'
Prunus 'Shirofugen' - Prunus 'Shirofugen'
Prunus 'Shirotae' - Prunus 'Shirotae'
Prunus 'Tai Haku' - Great white cherry
Prunus 'Ukon' - Prunus 'Ukon'
Prunus 'Umineko' - Prunus 'Umineko'
Prunus amygdalus - Almond
Prunus armeniaca - Apricot
Prunus avium - Wild cherry
Prunus blireana - Double cherry plum
Prunus cerasifera 'Pissardi' - Cherry plum 'Pissardii'
Prunus cerasifera 'Pissardii' - Purple-leaved plum
Prunus cerasifera - Cherry plum
Prunus cerasus - Sour cherry
Prunus domestica - Plum
Prunus domestica ssp. insititia - Damson
Prunus domestica ssp. insititia nigra - Bullace
Prunus himalaica - Himalayan cherry
Prunus laurocerasus - Cherry laurel
Prunus lusitanica - Portugal laurel
Prunus maackii - Manchurian cherry
Prunus padus - Bird cherry
Prunus persica - Peach
Prunus sargentii - Japanese cherry
Prunus serotina - Black cherry
Prunus serrula - Paperbark cherry
Prunus serrulata - Japanese cherry
Prunus sp. 'Cherry' - Cherry
Prunus spinosa - Blackthorn
Prunus spp. - Ornamental cherry
Prunus subhirtella - Winter-flowering cherry
Prunus x schmittii - Schmitts cherry
Prunus x yedoensis - Yoshino cherry
Pseudotsuga japonica - Japanese Douglas fir
Pseudotsuga macrocarpa - Bigcone Douglas fir
Pseudotsuga menziesii - Douglas fir
Pseudotsuga sp. - Fir (pseudotsuga)
Pterocarya fraxinifolia - Caucasian wingnut
Pterocarya rehderana - Hybrid wingnut
Pterocarya stenoptera - Chinese wingnut
Pyracantha sp. - Pyracantha
Pyrus calleryana 'Chanticleer' - Chanticleer pear
Pyrus calleryana - Callery pear
Pyrus communis - Pear
Pyrus salicifolia 'Pendula' - Willow-leaved pear
Pyrus salicifolia - Weeping pear
Pyrus sp. - Pear
Quercus acuta - Japanese evergreen oak
Quercus acutissima - Sawtooth oak
Quercus agrifolia - California live oak
Quercus alba - White oak
Quercus bicolor - Swamp white oak
Quercus canariensis - Algerian oak
Quercus castaneifolia - Chestnut-leaved oak
Quercus cerris - Turkey oak
Quercus coccinea - Scarlet oak
Quercus dentata - Daimyo oak
Quercus frainetto - Hungarian oak
Quercus ilex - Holm oak
Quercus imbricaria - Shingle oak
Quercus libani - Lebanon oak
Quercus macranthera - Caucasian oak
Quercus macrocarpa - Bur oak
Quercus marilandica - Blackjack oak
Quercus myrsinifolia - Bamboo-leaf oak
Quercus nigra - Water oak
Quercus palustris - Pin oak
Quercus petraea - Sessile oak
Quercus phellos - Willow oak
Quercus pontica - Armenian oak
Quercus pubescens - Downy oak
Quercus pyrenaica - Pyrenean oak
Quercus robur 'Fastigiata' - Fastigiate oak
Quercus robur - Pedunculate oak
Quercus robur Fastigiata - Cyprus oak
Quercus rubra - Red oak
Quercus spp. - Oak
Quercus suber - Cork oak
Quercus turneri - Turner's oak
Quercus variabilis - Chinese cork oak
Quercus velutina - Black oak
Quercus x hispanica 'Lucombeana' - Lucombe oak
Reynoutria japonica - Japanese knotweed
Rhamnus alaternus 'Argenteovariegata' - Variegated buckthorn
Rhamnus cathartica - Buckthorn
Rhamnus catharticus - Purging buckthorn
Rhamnus sp. - Buckthorn species
Rhododendron arboreum - Tree rhododendron
Rhododendron barbatum - Barbatum
Rhododendron calophytum - Calophytum
Rhododendron falconeri - Falconer
Rhododendron griffithianum - Griffithianum
Rhododendron macabeanum - Macabeanum
Rhododendron ponticum - Rhododendron
Rhododendron rex - Rex
Rhododendron sinogrande - Sinogrande
Rhus glabra - Smooth sumac
Rhus potaninii - Chinese varnish tree
Rhus sp. - Sumac
Rhus typhina - Stag's horn sumach
Rhus verniciflua - Varnish tree
Robinia hispida 'Rosea' - Pink acacia
Robinia hispida - Rose acacia
Robinia pseudoacacia 'Frisia' - Golden robinia
Robinia pseudoacacia 'Umbraculifera' - Mop-head acacia
Robinia pseudoacacia - False acacia
Robinia pseudoacacia Frisia - Golden acacia
Robinia sp. - Robinia
Rosa canina - Dogrose
Rosmarinus sp. - Rosea rosemary
Rubus sp. - Bramble
Salix alba - White willow
Salix alba sericea - Silver willow
Salix babylonica - Weeping willow
Salix britzensis - Coralbark willow
Salix caprea - Goat willow
Salix cinerea - Grey willow
Salix coerulea - Cricket bat willow
Salix daphnoides - Violet willow
Salix fragilis - Crack willow
Salix lanata - Woolly willow
Salix lapponum - Downy willow
Salix matsudana 'Tortuosa' - Corkscrew willow
Salix matsudana - Chinese willow
Salix myrsinifolia - Dark-leaved willow
Salix myrsinites - Whortle-leaved willow
Salix pentandra - Bay willow
Salix phylicifolia - Tea-leaved willow
Salix purpurea - Purple willow
Salix reticulata - Net-leaved willow
Salix spp. - Willow
Salix triandra - Almond willow
Salix viminalis - Osier
Salix x sepulcralis - Weeping golden willow
Sambucas nigra - Black elder
Sambucas racemosa - European red elder
Sambucus nigra - Elder
Sambucus sp. - Elder species
Sassafras albidum - Sassafras
Saxegothaea conspicua - Prince alberts yew
Sequoia sempervirens - Coast redwood
Sequoia sp. - Sequoia
Sequoiadendron giganteum - Wellingtonia
Sophora japonica 'Pendula' - Pagoda tree 'Pendula'
Sophora japonica - Pagoda tree
Sorbus aria - Whitebeam
Sorbus aucuparia 'Joseph Rock' - Sorbus 'Joseph Rock'
Sorbus aucuparia - Rowan
Sorbus cashmiriana - Kashmir rowan
Sorbus commixta - Japanese rowan
Sorbus commixta embley - Chinese scarlet rowan
Sorbus cuspidata - Himalayan whitebeam
Sorbus domestica - Service tree
Sorbus folgneri - Folgner's whitebeam
Sorbus hupehensis - Hupeh rowan
Sorbus intermedia - Swedish whitebeam
Sorbus latifolia - Service tree of fontainebleau
Sorbus sargentiana - Sargent's rowan
Sorbus sp. - Sorbus
Sorbus thibetica 'W J Mitchell' - Sorbus 'W J Mitchell'
Sorbus thuringiaca 'Fastigiata' - Bastard service tree 'Fastigiata'
Sorbus thuringiaca - Bastard service tree
Sorbus torminalis - Wild service tree
Sorbus vilmorinii - Vilmorin's rowan
Staphylea colchica - Colchis bladdernut
Staphylea holocarpa 'Rosea' - Bladdernut
Stuartia pseudocamellia - Deciduous camellia
Stuartia sinensis - Chinese stuartia
Styphnolobium japonica - Scholars tree
Styrax hemsleyana - Hemsley's storax
Styrax japonica - Snowbell tree
Styrax obassia - Bigleaf storax
Syringa sp. - Lilac
Syringa vulgaris 'Alba' - White flowering common lilac
Syringa vulgaris - Common lilac
Tamarix - Tamarisk
Taxodium ascendens - Pond cypress
Taxodium distichum 'Swamp' - Swamp cypress
Taxodium distichum - Deciduous cypress
Taxus baccata 'Adpressa Variegata' - Variegated yew
Taxus baccata 'Fastigiata' - Irish yew
Taxus baccata - Yew
Taxus cuspidata - Japanese yew
Taxus sp. - Yew
Tetracentron sinense - Spur leaf
Tetradium danielli - Bee bee tree
Tetradium daniellii - Tetradium
Thuja koraiensis - Korean thuja
Thuja occidentalis - White cedar
Thuja orientalis - Chinese arbor-vitae
Thuja plicata - Western red cedar
Thuja sp. - Thuja
Thuja standishii - Japanese thuja
Thujopsis dolabrata - Hiba
Tilia amurensis - Amur lime
Tilia cordata - Small-leaved lime
Tilia moltkei - Von moltke's lime
Tilia mongolica - Mongolian lime
Tilia oliveri - Oliver's lime
Tilia platyphyllos - Large-leaved lime
Tilia spp. - Lime
Tilia tomentosa 'Petiolaris' - Weeping silver lime
Tilia tomentosa - Silver lime
Tilia x euchlora - Caucasian lime
Tilia x europaea - Common lime
Tilia x vulgaris - Common lime
Tilla americana - American lime
Torreya californica - California nutmeg
Torreya nucifera - Japanese nutmeg
Trachycarpus fortunei - Chusan palm
Trochodendron aralioides - Wheel tree
Tsuga canadensis - Eastern hemlock
Tsuga caroliniana - Carolina hemlock
Tsuga chinensis - Chinese hemlock
Tsuga diversifolia - Northern Japanese hemlock
Tsuga dumosa - Himalayan hemlock
Tsuga heterophylla - Western hemlock
Tsuga jeffreyi - Jeffrey's hemlock
Tsuga mertensiana - Mountain hemlock
Tsuga sieboldii - Southern Japanese hemlock
Tsuga sp. - Hemlock
Ulex europaeus - Gorse
Ulmus 'New Horizon' - New Horizon Elm
Ulmus americana - American elm
Ulmus carpinifolia - Smooth leafed elm
Ulmus glabra - Wych elm
Ulmus hollandica - Dutch elm
Ulmus laevis - European white elm
Ulmus minor 'Stricta' - Cornish elm
Ulmus minor - Field elm
Ulmus minor var. vulgaris - Ulmus minor var. vulgaris (English Elm)
Ulmus parviflora - Chinese elm
Ulmus procera - English elm
Ulmus pumila - Siberian elm
Ulmus sarniensis - Wheatley elm
Ulmus spp. - Elm
Ulmus x hollandica 'Vegeta' - Huntingdon elm
Viburnum lantana - Wayfaring tree
Viburnum opulus - Guelder rose
Viburnum sp. - Viburnum
Viburnum tinus - Laurustinus
Wisteria floribunda - Japanese wisteria
Wisteria sinensis - Wisteria
X Cupressocyparis leylandii 'Green Spire' - Leyland cypress 'Green Spire'
X Cupressocyparis leylandii 'Haggerston Grey' - Leyland cypress 'Haggerston Grey'
X Cuprocyparis leylandii - Leyland cypress
Zelkova carpinifolia - Caucasian elm
Zelkova serrata - Japanese zelkova
Zelkova sinica - Chinese zelkova
Zelkova sp. - Zelkova
Zelkova verschaffeltii - Cutleaf zelkova
Mixed broadleaves - Mixed broadleaves
Mixed conifers - Mixed conifers
Mixed species - Mixed species`.split("\n");
