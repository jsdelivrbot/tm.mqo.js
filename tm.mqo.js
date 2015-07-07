(function() {
    tm.asset = tm.asset || {};

    tm.define("tm.asset.MQO", {
        superClass: "tm.event.EventDispatcher",

        init: function(path) {
            this.superInit();
            this.mesh = null;
        },

        // URL���烍�[�h
        loadFromURL: function(path) {
            _modelurl = path.split("/");
            var req = new XMLHttpRequest();
            req.open("GET", url, true);
            req.onload = function(){
                var data = req.responseText;
                self.loadFromData(data, onload);
            };
            req.send(null);
        },

        //�f�[�^���烍�[�h
        loadFromData: function(data, onload) {
            var model = tm.MQOModel(data);
        },
    });

    //���[�_�[�Ɋg���q�o�^
    tm.asset.Loader.register("mqo", function(path) {
        return tm.asset.MQO(path);
    });

    //���^�Z�R�C�A���f��
    tm.define("tm.MQOModel", {
        //���b�V���A���C
        meshes: [],

        //�}�e���A���A���C
        materials: [],
        
        init: function(data) {
            this.parse(data);
        },

        parse: function(data) {
            // �I�u�W�F�N�g
            var objectText = text.match(/^Object [\s\S]*?^\}/gm);
            for (var i = 0, len = objectText.length; i < len; ++i) {
                var mesh = tm.MqoMesh(objectText[i]);
                this.meshes.push(mesh);
            }

            // �}�e���A��
            var materialText = text.match(/^Material [\s\S]*?^\}/m);
            for (var i = 0, len = materialText.length; i < len; ++i) {
                var material = tm.MqoMaterial(materialText[i]);
                this.materials.phsh(material);
            }
        },

        convert: function(){
        },
    });

    tm.define("tm.MQOMesh", {
        vertices: [],   // ���_
        faces: [],      // �ʏ��
        vertNormals: [],// ���_�@��
        
        facet: 59.5,    // �X���[�W���O�p�x

        mirror: 0,      //�~���[�����O
        mirrorAxis: 0,  //�~���[�����O��

        init: function(text) {
            this.parse(text);
        },

        parse:function(text){
            //�I�u�W�F�N�g��
            var name = text.split(' ');
            this.name = name[1].replace(/"/g, "");

            //�X���[�W���O�p
            var facet = text.match(/facet ([0-9\.]+)/);
            if( facet ){ this.facet = Number(facet[1]); }

            //���t���O
            var visible = text.match(/visible ([0-9\.]+)/);
            if( visible ){ this.visible = Number(visible[1]); }

            //�~���[�����O
            var mirror = text.match(/mirror ([0-9])/m);
            if( mirror ){
                this.mirror = Number(mirror[1]);
                // ��
                var mirrorAxis = text.match(/mirror_axis ([0-9])/m);
                if( mirrorAxis ){
                    this.mirrorAxis = Number(mirrorAxis[1]);
                }
            }

            //���_���
            var vertex_txt = text.match(/vertex ([0-9]+).+\{\s([\w\W]+)}$/gm);
            this._parseVertices( RegExp.$1, RegExp.$2 );

            //�t�F�[�X���
            var face_txt = text.match(/face ([0-9]+).+\{\s([\w\W]+)}$/gm);
            this._parseFaces( RegExp.$1, RegExp.$2 );
        },

        /**
         *  ���b�V���փR���o�[�g
         *  root:���[�g�I�u�W�F�N�g
         *  materials:�}�e���A�����X�g
         */
        convert: function(){
            //�s���ݒ�̏ꍇ�͏������X�L�b�v
            if( this.visible == 0 ){
                return;
            }

            //�t�F�[�X���g�p����}�e���A���𒲂ׂ�
            var facemat = [];
            facemat[facemat.length] = this.faces[0].m[0];
            for (var i = 0, lf = this.faces.length; i < lf; i++ ){
                var fm = -1;
                for (var j = 0, lfm = facemat.length; j < lfm; j++ ){
                    if (facemat[j] != this.faces[i].m[0]) fm = this.faces[i].m[0];
                }
                if( fm != -1 )facemat[facemat.length] = fm;
            }

            var root = tm.hybrid.Mesh(new THREE.Mesh(geo, mat));

            //�g�p�}�e���A���ɉ����ăI�u�W�F�N�g�𕪊��ϊ�
            for( var i = 0; i < facemat.length; i++ ){
                var matnum = facemat[i];
                var sp = this.convertWithMaterial(materials.materialList[matnum], matnum);
                if( sp ) root.addChild(sp);
            }
        },

        //���_���̃p�[�X
        _parseVertices: function(num, text) {
            var vertexTextList = text.split('\n');
            for (var i = 1; i <= num; i++) {
                var vertex = vertexTextList[i].split(' ');
                vertex[0] = Number(vertex[0])*0.01;
                vertex[1] = Number(vertex[1])*0.01;
                vertex[2] = Number(vertex[2])*0.01;
                this.vertices.push(vertex);
            }

            //�~���[�����O�Ή�
            if (this.mirror) {
                var self = this;
                var toMirror = (function(){
                    return {
                        1: function(v) { return [ v[0]*-1, v[1], v[2] ]; },
                        2: function(v) { return [ v[0], v[1]*-1, v[2] ]; },
                        4: function(v) { return [ v[0], v[1], v[2]*-1 ]; },
                    }[self.mirrorAxis];
                })();
                var len = this.vertices.length;
                for (var i = 0; i < len; i++) {
                    this.vertices.push(toMirror(this.vertices[i]));
                }
            }
        },

        //�t�F�[�X���̃p�[�X
        _parseFaces: function(num, text) {
            var faceTextList = text.split('\n');

            //�@���v�Z
            var calcNormalize = function(a, b, c) {
                var v1 = [ a[0] - b[0], a[1] - b[1], a[2] - b[2] ];
                var v2 = [ c[0] - b[0], c[1] - b[1], c[2] - b[2] ];
                var v3 = [
                    v1[1]*v2[2] - v1[2]*v2[1],
                    v1[2]*v2[0] - v1[0]*v2[2],
                    v1[0]*v2[1] - v1[1]*v2[0]
                ];
                var len = Math.sqrt(v3[0]*v3[0] + v3[1]*v3[1] + v3[2]*v3[2]);
                v3[0] /= len;
                v3[1] /= len;
                v3[2] /= len;

                return v3;
            };

            for (var i = 1; i <= num; i++ ){
                // �g�������Ƃ�
                var faceText = faceTextList[i].replace(/^\s+|\s+$/g, "");
                // �ʂ̐�
                var vertex_num = Number(faceText[0]);

                var info = faceText.match(/([A-Za-z]+)\(([\w\s\-\.\(\)]+?)\)/gi);
                var face = { vNum: vertex_num };
                
                for (var j = 0,len = info.length; j < len; j++) {
                    var m = info[j].match(/([A-Za-z]+)\(([\w\s\-\.\(\)]+?)\)/);
                    var key = m[1].toLowerCase();
                    var value = m[2].split(" ");
                    value.forEach(function(elm, i, arr){
                        arr[i] = Number(elm);
                    });
                    face[key] = value;
                }
                
                // UV �f�t�H���g�l
                if (!face.uv) {
                    face.uv = [0, 0, 0, 0, 0, 0, 0, 0];
                }

                // �}�e���A�� �f�t�H���g�l
                if (!face.m) {
                    face.m = [undefined];
                }

                // �@���i�ʂ̏ꍇ�̂݁j
                if (face.v.length > 2) {
                    face.n = calcNormalize(this.vertices[face.v[0]], this.vertices[face.v[1]], this.vertices[face.v[2]]);
                }

                this.faces.push(face);
            }

            // �~���[�����O�Ή�
            if( this.mirror ){
                var swap = function(a,b){ var temp = this[a]; this[a] = this[b]; this[b] = temp; return this; };
                var len = this.faces.length;
                var vertexOffset = (this.vertices.length/2);
                for(var i = 0; i < len; i++) {
                    var targetFace = this.faces[i];
                    var face = {
                        uv  : [],
                        v   : [],
                        vNum: targetFace.vNum,
                    };
                    for (var j = 0; j < targetFace.v.length; j++) { face.v[j] = targetFace.v[j] + vertexOffset; }
                    for (var j = 0; j < targetFace.uv.length; j++) { face.uv[j] = targetFace.uv[j]; }

                    if (face.vNum == 3) {
                        swap.call(face.v, 1, 2);
                    } else {
                        swap.call(face.v, 0, 1);
                        swap.call(face.v, 2, 3);
                    }

                    face.n = targetFace.n;
                    face.m = targetFace.m;

                    this.faces.push(face);
                }
            }

            // ���_�@�������߂�
            var vertNormal = Array(this.vertices.length);
            for (var i = 0, len = this.vertices.length; i < len; i++) vertNormal[i] = [];

            for (var i = 0; i < this.faces.length; i++) {
                var face = this.faces[i];
                var vIndices = face.v;

                for (var j = 0; j < face.vNum; j++) {
                    var index = vIndices[j];
                    vertNormal[index].push.apply(vertNormal[index], face.n);
                }
            }

            for (var i = 0; i < vertNormal.length; i++) {
                var vn = vertNormal[i];
                var result = [0, 0, 0];
                var len = vn.length/3;
                for (var j = 0; j < len; j++) {
                    result[0] += vn[j*3+0];
                    result[1] += vn[j*3+1];
                    result[2] += vn[j*3+2];
                }

                result[0] /= len;
                result[1] /= len;
                result[2] /= len;

                var len = Math.sqrt(result[0]*result[0] + result[1]*result[1] + result[2]*result[2]);
                result[0] /= len;
                result[1] /= len;
                result[2] /= len;
                
                this.vertNormals[i] = result;
            }
        },
    });

    tm.define("tm.MQOMaterial", {
        init: function(text) {
        },

        //�}�e���A�����̃p�[�X
        parse: function(text) {
            var infoText    = text.match(/^Material [0-9]* \{\r\n([\s\S]*?)\n^\}$/m);
            var matTextList = infoText[1].split('\n');

            for (var i = 0, len = matTextList.length; i < len; i++) {
                var mat = {};
                // �g�������Ƃ�
                var matText = matTextList[i].replace(/^\s+|\s+$/g, "");
                var info = matText.match(/([A-Za-z]+)\(([\w\W]+?)\)/gi);    //�}�e���A�����������

                var nl = matText.split(' ');    //�}�e���A�����擾
                mat['name'] = nl[0].replace(/"/g, "");

                for( var j = 0, len2 = info.length; j < len2; j++ ){
                    var m = info[j].match(/([A-Za-z]+)\(([\w\W]+?)\)/); //�v�f�𔲂��o��
                    var key = m[1].toLowerCase();   //�����񏬕�����
                    var value = null;

                    if( key != "tex" && key != "aplane" ){
                        //�e�N�X�`���ȊO�̗v�f
                        value = m[2].split(" ");
                        value.forEach(function(elm, i, arr){
                            arr[i] = Number(elm);
                        });
                    }else{
                        //�e�N�X�`���̏ꍇ
                        value = m[2].replace(/"/g, "");
                    }
                    mat[key] = value;
                }
                this.materialList.push(mat);
            }
        },
    });

})();

